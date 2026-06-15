import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, InputNumber, Modal, SelectPicker, Toggle } from 'rsuite';
import { useServerImages } from './useServerImages';
import { IMAGES, isServerImage } from './ImagePicker';
import { projectImageApiBase, resolveImageProject } from './projectImages';
import { useProjectImages } from './ProjectImagesContext';
import PromptHistory from '../ai/PromptHistory';

interface ImagePickerModalProps {
    open: boolean;
    onClose: () => void;
    value?: string;
    onChange: (val: string | null) => void;
    extensions?: string[];
    projectName?: string;
    /** Server image filename to use as img2img source for thumbnail generation. */
    sourceImage?: string;
    /** Open directly on this source tab. */
    initialSource?: Source;
    /** Pre-fill the AI generate prompt with this value. */
    initialPrompt?: string;
}

type Source = 'server' | 'local' | 'other' | 'generate' | 'fromSource';

type GenStatus = 'idle' | 'submitting' | 'polling' | 'done' | 'error';

interface GenState {
    status: GenStatus;
    txt2imgModels: string[];
    img2imgModels: string[];
    modelsLoaded: boolean;
    model: string;
    prompt: string;
    negativePrompt: string;
    overrideNegative: boolean;
    workflow: 'txt2img' | 'img2img';
    inputImage: string;
    seed: string;
    dataPreparationEnabled: boolean;
    dataPreparationMode: 'exact' | 'max';
    dataPreparationWidth: number;
    dataPreparationHeight: number;
    dataPreparationPx: string;
    dataPreparationMp: string;
    comfyParamsEnabled: boolean;
    comfyParamsJson: string;
    width: number;
    height: number;
    taskCap: string;
    taskId: string;
    outputBucket: string;
    resultFilename: string | null;
    error: string | null;
    avgTime: number | null;   // seconds, from server
    pollStart: number | null; // Date.now() when polling began
}

const DEFAULT_THUMBNAIL_PROMPT =
    'game UI thumbnail, square crop, clear focal subject, vibrant colors, clean composition';

const SIZE_PRESETS = [
    { label: '512 × 512',   w: 512,  h: 512 },
    { label: '768 × 512',   w: 768,  h: 512 },
    { label: '512 × 768',   w: 512,  h: 768 },
    { label: '768 × 768',   w: 768,  h: 768 },
    { label: '1024 × 576',  w: 1024, h: 576 },
    { label: '576 × 1024',  w: 576,  h: 1024 },
    { label: '1024 × 768',  w: 1024, h: 768 },
    { label: '768 × 1024',  w: 768,  h: 1024 },
    { label: '1024 × 1024', w: 1024, h: 1024 },
    { label: '1280 × 720',  w: 1280, h: 720 },
    { label: '1152 × 896',  w: 1152, h: 896 },
    { label: '1216 × 832',  w: 1216, h: 832 },
];

const DEFAULT_GEN: GenState = {
    status: 'idle',
    txt2imgModels: [],
    img2imgModels: [],
    modelsLoaded: false,
    model: '',
    prompt: '',
    negativePrompt: '',
    overrideNegative: false,
    workflow: 'txt2img',
    inputImage: '',
    seed: '',
    dataPreparationEnabled: false,
    dataPreparationMode: 'exact',
    dataPreparationWidth: 768,
    dataPreparationHeight: 768,
    dataPreparationPx: '',
    dataPreparationMp: '',
    comfyParamsEnabled: false,
    comfyParamsJson: '',
    width: 1024,
    height: 1024,
    taskCap: '',
    taskId: '',
    outputBucket: '',
    resultFilename: null,
    error: null,
    avgTime: null,
    pollStart: null,
};

// Generation parameters persisted to localStorage between sessions.
// Everything tunable EXCEPT the prompt (content) and transient runtime fields
// (status, task refs, results, model lists, input image).
const IMGGEN_PARAMS_KEY = 'dln.imggen.params';

const PERSISTED_PARAM_KEYS = [
    'model',
    'negativePrompt',
    'overrideNegative',
    'workflow',
    'seed',
    'dataPreparationEnabled',
    'dataPreparationMode',
    'dataPreparationWidth',
    'dataPreparationHeight',
    'dataPreparationPx',
    'dataPreparationMp',
    'comfyParamsEnabled',
    'comfyParamsJson',
    'width',
    'height',
] as const satisfies readonly (keyof GenState)[];

function loadPersistedParams(): Partial<GenState> {
    try {
        const raw = localStorage.getItem(IMGGEN_PARAMS_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return {};
        const out: Partial<GenState> = {};
        for (const k of PERSISTED_PARAM_KEYS) {
            if (k in parsed) (out as Record<string, unknown>)[k] = parsed[k];
        }
        return out;
    } catch {
        return {};
    }
}

function savePersistedParams(gen: GenState): void {
    try {
        const out: Record<string, unknown> = {};
        for (const k of PERSISTED_PARAM_KEYS) out[k] = gen[k];
        localStorage.setItem(IMGGEN_PARAMS_KEY, JSON.stringify(out));
    } catch {
        // ignore quota / serialization errors
    }
}

const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
    open,
    onClose,
    value,
    onChange,
    extensions,
    projectName,
    sourceImage,
    initialSource,
    initialPrompt,
}) => {
    const contextProject = useProjectImages();
    const storageProject = resolveImageProject(projectName ?? contextProject);
    const apiBase = projectImageApiBase(storageProject);

    const effectiveSourceImage =
        sourceImage && isServerImage(sourceImage) ? sourceImage : undefined;
    const [source, setSource] = useState<Source>('server');
    const [localFiles, setLocalFiles] = useState<string[]>([]);
    const [selected, setSelected] = useState<string | null>(value ?? null);
    const [otherProjects, setOtherProjects] = useState<string[]>([]);
    const [otherProject, setOtherProject] = useState<string | null>(null);
    const [otherImages, setOtherImages] = useState<string[]>([]);
    const [gen, setGen] = useState<GenState>(DEFAULT_GEN);
    const [fullscreenSrc, setFullscreenSrc] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const rafRef = useRef<number | null>(null);
    const imggenInputFileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!fullscreenSrc) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreenSrc(null); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [fullscreenSrc]);

    // Smooth progress bar driven by avg_time
    useEffect(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        if (gen.status !== 'polling' || !gen.avgTime || !gen.pollStart) {
            if (gen.status === 'done') setProgress(100);
            else if (gen.status !== 'polling') setProgress(0);
            return;
        }
        const avgMs = gen.avgTime * 1000;
        const start = gen.pollStart;
        const tick = () => {
            const elapsed = Date.now() - start;
            // Ease toward 95% asymptotically so bar never reaches 100% until done
            const raw = elapsed / avgMs;
            const p = Math.min(95, 100 * (1 - Math.exp(-2.5 * raw)));
            setProgress(p);
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [gen.status, gen.avgTime, gen.pollStart]);

    const { images, uploading, fetchImages, uploadFile, deleteImage, thumbUrl, fileInputRef } =
        useServerImages(storageProject);

    useEffect(() => {
        if (!open) return;
        setSelected(value ?? null);
        if (initialSource) setSource(initialSource);
        if (initialPrompt) setGen(g => ({ ...g, prompt: initialPrompt }));
        fetchImages();
        fetch('game_assets/list.json')
            .then(r => r.json())
            .then(data => setLocalFiles(Array.isArray(data) ? data : []))
            .catch(() => setLocalFiles([]));
        fetch('/api/v1/projects')
            .then(r => r.json())
            .then(data => {
                const all: string[] = Array.isArray(data.projects)
                    ? data.projects.map((p: { name: string } | string) =>
                        typeof p === 'string' ? p : p.name)
                    : [];
                const others = all.filter(p => p !== storageProject);
                setOtherProjects(others);
                if (others.length > 0 && (otherProject === null || !others.includes(otherProject))) {
                    setOtherProject(others[0]);
                }
            })
            .catch(() => setOtherProjects([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, value, fetchImages, storageProject]);

    useEffect(() => {
        if (source !== 'other' || !otherProject) {
            setOtherImages([]);
            return;
        }
        fetch(`/api/v1/projects/${encodeURIComponent(otherProject)}/images`)
            .then(r => r.json())
            .then(data => setOtherImages(Array.isArray(data.images) ? data.images : []))
            .catch(() => setOtherImages([]));
    }, [source, otherProject]);

    // Load models when switching to generate or fromSource tab
    useEffect(() => {
        if (source !== 'generate' && source !== 'fromSource') return;
        if (gen.modelsLoaded) return;
        Promise.all([
            fetch('/api/v1/imggen/models?workflow=txt2img').then(r => r.json() as Promise<string[]>),
            fetch('/api/v1/imggen/models?workflow=img2img').then(r => r.json() as Promise<string[]>),
        ])
            .then(([txt2imgModels, img2imgModels]) => {
                setGen(g => {
                    const currentModels = g.workflow === 'txt2img' ? txt2imgModels : img2imgModels;
                    const model = (g.model && currentModels.includes(g.model))
                        ? g.model
                        : (currentModels[0] ?? '');
                    return { ...g, txt2imgModels, img2imgModels, modelsLoaded: true, model };
                });
            })
            .catch(() => {
                setGen(g => ({ ...g, modelsLoaded: true, error: 'Failed to load models', status: 'error' }));
            });
    }, [source, gen.modelsLoaded]);

    // Polling loop
    useEffect(() => {
        if (gen.status !== 'polling') {
            if (pollRef.current) clearInterval(pollRef.current);
            return;
        }
        const taskCap = gen.taskCap;
        const taskId = gen.taskId;
        const outputBucket = gen.outputBucket;
        pollRef.current = setInterval(async () => {
            try {
                const r = await fetch(
                    `/api/v1/imggen/status/${encodeURIComponent(storageProject)}/${encodeURIComponent(taskCap)}/${encodeURIComponent(taskId)}/${encodeURIComponent(outputBucket)}`
                );
                const data = await r.json();
                if (data.status === 'completed') {
                    clearInterval(pollRef.current!);
                    setGen(g => ({ ...g, status: 'done', resultFilename: data.filename ?? null }));
                } else if (data.status === 'failed') {
                    clearInterval(pollRef.current!);
                    setGen(g => ({ ...g, status: 'error', error: data.error ?? 'Generation failed' }));
                } else if (data.avg_time != null) {
                    setGen(g => ({ ...g, avgTime: data.avg_time }));
                }
            } catch {
                // keep polling on transient errors
            }
        }, 3000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [gen.status, gen.taskCap, gen.taskId, gen.outputBucket, storageProject]);

    const handleGenerate = async () => {
        await submitGeneration('full');
    };

    const handleGenerateFromSource = async () => {
        if (!effectiveSourceImage) return;
        await submitGeneration('thumbnail');
    };

    const submitGeneration = async (mode: 'full' | 'thumbnail') => {
        if (mode === 'full') {
            if (!gen.model || !gen.prompt.trim()) return;
            if (gen.workflow === 'img2img' && !gen.inputImage) return;
        }

        setGen(g => ({ ...g, status: 'submitting', error: null, resultFilename: null }));
        try {
            if (mode === 'thumbnail') {
                const r = await fetch(
                    `/api/v1/projects/${encodeURIComponent(storageProject)}/images/resize`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            source_image: effectiveSourceImage,
                            width: gen.width,
                            height: gen.height,
                            mode: 'crop',
                        }),
                    }
                );
                if (!r.ok) throw new Error(await r.text());
                const data = await r.json();
                setGen(g => ({ ...g, status: 'done', resultFilename: data.filename ?? null }));
                return;
            }

            const body = {
                project_name: storageProject,
                model: gen.model,
                prompt: gen.prompt,
                negative_prompt: gen.negativePrompt || null,
                override_negative: gen.overrideNegative,
                workflow: gen.workflow,
                input_image: gen.workflow === 'img2img' ? gen.inputImage : null,
                data_preparation: buildDataPreparation(),
                width: gen.width,
                height: gen.height,
                seed: gen.seed.trim() ? Number(gen.seed) : null,
                comfy_params: parseComfyParams(),
                rescale: {
                    enabled: gen.dataPreparationEnabled,
                    mode: gen.dataPreparationMode,
                    width: gen.dataPreparationWidth,
                    height: gen.dataPreparationHeight,
                    px: gen.dataPreparationPx.trim() ? Number(gen.dataPreparationPx) : null,
                    mp: gen.dataPreparationMp.trim() ? Number(gen.dataPreparationMp) : null,
                },
            };

            const r = await fetch('/api/v1/imggen/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!r.ok) throw new Error(await r.text());
            const data = await r.json();
            setGen(g => ({
                ...g,
                status: 'polling',
                taskCap: data.cap,
                taskId: data.id,
                outputBucket: data.output_bucket,
                pollStart: Date.now(),
                avgTime: null,
            }));
        } catch (e) {
            setGen(g => ({ ...g, status: 'error', error: String(e) }));
        }
    };

    const handleSelectGenerated = () => {
        if (!gen.resultFilename) return;
        fetchImages();
        onChange(gen.resultFilename);
        onClose();
    };

    const handleDeleteGenerated = async () => {
        if (!gen.resultFilename) return;
        await deleteImage(gen.resultFilename);
        setGen(g => ({ ...g, status: 'idle', resultFilename: null, error: null }));
    };

    const handleRegenerate = async () => {
        if (gen.resultFilename) {
            await deleteImage(gen.resultFilename);
        }
        setGen(g => ({ ...g, resultFilename: null, error: null }));
        if (source === 'fromSource') {
            await handleGenerateFromSource();
        } else {
            await handleGenerate();
        }
    };

    const handleDeleteServerImage = async (filename: string) => {
        await deleteImage(filename);
        if (selected === filename) setSelected(null);
        fetchImages();
    };

    const exts = extensions || IMAGES;
    const localItems = localFiles.filter(f => exts.some(e => f.endsWith(`.${e}`) || f.endsWith(e)));

    const currentItems =
        source === 'server' ? images :
        source === 'local' ? localItems :
        otherImages;

    const thumbUrlOther = (filename: string) =>
        `/api/v1/projects/${encodeURIComponent(otherProject ?? '')}/image_thumbs/${encodeURIComponent(filename)}`;

    const getThumb = (filename: string) => {
        if (source === 'server') return thumbUrl(filename);
        if (source === 'local') return `/game_assets/${filename}`;
        return thumbUrlOther(filename);
    };

    const getFullUrl = (filename: string) => {
        if (source === 'server') return `${apiBase}/images/${encodeURIComponent(filename)}`;
        if (source === 'local') return `/game_assets/${filename}`;
        return `/api/v1/projects/${encodeURIComponent(otherProject ?? '')}/images/${encodeURIComponent(filename)}`;
    };

    const selectedFullUrl = selected
        ? getFullUrl(selected.startsWith('game_assets/') ? selected.slice('game_assets/'.length) : selected)
        : null;

    const getStoredValue = (filename: string) => {
        if (source === 'server') return filename;
        if (source === 'local') return `game_assets/${filename}`;
        return filename;
    };

    const handleSelect = (filename: string) => {
        setSelected(getStoredValue(filename));
    };

    const handleConfirm = () => {
        onChange(selected);
        onClose();
    };

    const handleClear = () => {
        onChange(null);
        onClose();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            await uploadFile(file, (name) => {
                fetchImages();
                setSelected(name);
            });
        } catch (err) {
            setGen(g => ({ ...g, status: 'error', error: String(err) }));
        }
        e.target.value = '';
    };

    const handleImggenInputUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            await uploadFile(file, (name) => {
                fetchImages();
                setGen(g => ({ ...g, inputImage: name }));
            });
        } catch (err) {
            setGen(g => ({ ...g, status: 'error', error: String(err) }));
        }
        e.target.value = '';
    };

    const selectedLabel = selected
        ? (selected.startsWith('game_assets/') ? selected.slice('game_assets/'.length) : selected)
        : 'No image selected';

    const genBusy = gen.status === 'submitting' || gen.status === 'polling';
    const imggenInputFullUrl = gen.inputImage
        ? `${apiBase}/images/${encodeURIComponent(gen.inputImage)}`
        : null;
    const sourceImageFullUrl = effectiveSourceImage
        ? `${apiBase}/images/${encodeURIComponent(effectiveSourceImage)}`
        : null;

    const renderGenerationResult = () => (
        <div className="imggen-result">
            {gen.status === 'idle' && (
                <div className="imggen-placeholder">Result will appear here</div>
            )}
            {genBusy && (
                <div className="imggen-placeholder">
                    {gen.status === 'submitting' ? 'Submitting task…' : 'Generating image…'}
                </div>
            )}
            {gen.status === 'polling' && gen.avgTime && (
                <div className="imggen-progress-wrap">
                    <div
                        className="imggen-progress-bar"
                        style={{ width: `${progress}%` }}
                    />
                    <span className="imggen-progress-label">
                        ~{Math.round(gen.avgTime)}s
                    </span>
                </div>
            )}
            {gen.status === 'error' && (
                <div className="imggen-error">{gen.error}</div>
            )}
            {gen.status === 'done' && gen.resultFilename && (
                <>
                    <img
                        className="imggen-preview"
                        src={`${apiBase}/images/${encodeURIComponent(gen.resultFilename)}`}
                        alt="Generated"
                        onClick={() => setFullscreenSrc(`${apiBase}/images/${encodeURIComponent(gen.resultFilename!)}`)}
                    />
                    <div className="imggen-result-actions">
                        <Button
                            appearance="primary"
                            size="sm"
                            onClick={handleSelectGenerated}
                        >
                            Select
                        </Button>
                        <Button
                            appearance="default"
                            size="sm"
                            onClick={() => setFullscreenSrc(`${apiBase}/images/${encodeURIComponent(gen.resultFilename!)}`)}
                        >
                            Preview
                        </Button>
                        <Button
                            appearance="default"
                            size="sm"
                            onClick={handleRegenerate}
                        >
                            Regenerate
                        </Button>
                        <Button
                            appearance="subtle"
                            size="sm"
                            onClick={handleDeleteGenerated}
                        >
                            Delete
                        </Button>
                    </div>
                </>
            )}
        </div>
    );

    const buildDataPreparation = (): Record<string, string> | null => {
        if (!gen.dataPreparationEnabled) return null;
        if (gen.dataPreparationMode === 'max') {
            const parts: string[] = [];
            if (gen.dataPreparationPx.trim()) parts.push(`px=${gen.dataPreparationPx.trim()}`);
            if (gen.dataPreparationMp.trim()) parts.push(`mp=${gen.dataPreparationMp.trim()}`);
            if (!parts.length) return null;
            return { '*': `scale/max[${parts.join(',')}]` };
        }
        return { '*': `scale/${gen.dataPreparationWidth}x${gen.dataPreparationHeight}` };
    };

    const parseComfyParams = (): Record<string, unknown> | null => {
        if (!gen.comfyParamsEnabled) return null;
        const raw = gen.comfyParamsJson.trim();
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Comfy params JSON must be an object');
        }
        return parsed as Record<string, unknown>;
    };

    return (
    <>
        <Modal open={open} onClose={onClose} size="lg" className="image-picker-modal">
            <Modal.Header>
                <Modal.Title>Select Image</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="image-picker-modal-body">
                    <div className="image-picker-modal-sidebar">
                        <div
                            className={`image-picker-modal-source${source === 'server' ? ' active' : ''}`}
                            onClick={() => setSource('server')}
                        >
                            Server Uploads
                        </div>
                        <div
                            className={`image-picker-modal-source${source === 'local' ? ' active' : ''}`}
                            onClick={() => setSource('local')}
                        >
                            Local Assets
                        </div>
                        <div
                            className={`image-picker-modal-source${source === 'other' ? ' active' : ''}`}
                            onClick={() => setSource('other')}
                        >
                            Other Projects
                        </div>
                        {source === 'other' && otherProjects.length > 0 && (
                            <div className="image-picker-modal-other-projects">
                                {otherProjects.map(p => (
                                    <div
                                        key={p}
                                        className={`image-picker-modal-other-project${otherProject === p ? ' active' : ''}`}
                                        onClick={() => setOtherProject(p)}
                                    >
                                        {p}
                                    </div>
                                ))}
                            </div>
                        )}
                        {source === 'other' && otherProjects.length === 0 && (
                            <div className="image-picker-modal-empty" style={{ padding: '8px 16px', fontSize: 12 }}>
                                No other projects
                            </div>
                        )}
                        <div
                            className={`image-picker-modal-source${source === 'generate' ? ' active' : ''}`}
                            onClick={() => setSource('generate')}
                        >
                            AI Generate
                        </div>
                        {effectiveSourceImage && (
                            <div
                                className={`image-picker-modal-source${source === 'fromSource' ? ' active' : ''}`}
                                onClick={() => {
                                    setSource('fromSource');
                                    setGen(g => ({
                                        ...g,
                                        prompt: g.prompt || DEFAULT_THUMBNAIL_PROMPT,
                                        width: g.width === 1024 && g.height === 1024 ? 512 : g.width,
                                        height: g.width === 1024 && g.height === 1024 ? 512 : g.height,
                                    }));
                                }}
                            >
                                From source image
                            </div>
                        )}
                    </div>

                    {source !== 'generate' && source !== 'fromSource' ? (
                        <div className="image-picker-modal-grid">
                            {currentItems.map(filename => {
                                const storedVal = getStoredValue(filename);
                                const isActive = selected === storedVal;
                                return (
                                    <div
                                        key={filename}
                                        className={`image-picker-modal-item${isActive ? ' selected' : ''}`}
                                        onClick={() => handleSelect(filename)}
                                        title={filename}
                                    >
                                        <img src={getThumb(filename)} alt={filename} />
                                        <span>{filename}</span>
                                    </div>
                                );
                            })}
                            {currentItems.length === 0 && (
                                <div className="image-picker-modal-empty">No images found</div>
                            )}
                        </div>
                    ) : source === 'fromSource' ? (
                        <div className="imggen-panel">
                            <div className="imggen-form">
                                <div className="imggen-field">
                                    <label>Source image</label>
                                    {effectiveSourceImage && sourceImageFullUrl && (
                                        <button
                                            type="button"
                                            className="imggen-input-preview"
                                            title={effectiveSourceImage}
                                            onClick={() => setFullscreenSrc(sourceImageFullUrl)}
                                        >
                                            <img src={thumbUrl(effectiveSourceImage)} alt={effectiveSourceImage} />
                                            <span>{effectiveSourceImage}</span>
                                        </button>
                                    )}
                                </div>
                                <div className="imggen-field">
                                    <label>Model</label>
                                    <SelectPicker
                                        data={gen.img2imgModels.map(m => ({ label: m.replace('imggen.', ''), value: m }))}
                                        value={gen.model}
                                        onChange={v => setGen(g => ({ ...g, model: v ?? '' }))}
                                        cleanable={false}
                                        searchable={false}
                                        placeholder={gen.modelsLoaded ? 'No available models' : 'Loading models…'}
                                        block
                                    />
                                </div>
                                <div className="imggen-field">
                                    <div className="imggen-label-row">
                                        <label>Prompt</label>
                                        <PromptHistory
                                            project={storageProject}
                                            workflow="image"
                                            onPick={v => setGen(g => ({ ...g, prompt: v }))}
                                            size="xs"
                                        />
                                    </div>
                                    <Input
                                        as="textarea"
                                        rows={3}
                                        value={gen.prompt || DEFAULT_THUMBNAIL_PROMPT}
                                        onChange={v => setGen(g => ({ ...g, prompt: v }))}
                                        placeholder={DEFAULT_THUMBNAIL_PROMPT}
                                    />
                                </div>
                                <div className="imggen-field">
                                    <label>Seed (optional)</label>
                                    <Input
                                        value={gen.seed}
                                        onChange={v => setGen(g => ({ ...g, seed: v }))}
                                        placeholder="empty = random"
                                    />
                                </div>
                                <div className="imggen-size-row">
                                    <div className="imggen-field">
                                        <label>Width</label>
                                        <InputNumber
                                            value={gen.width}
                                            min={256}
                                            max={1024}
                                            step={64}
                                            onChange={v => setGen(g => ({ ...g, width: Number(v) }))}
                                        />
                                    </div>
                                    <div className="imggen-field">
                                        <label>Height</label>
                                        <InputNumber
                                            value={gen.height}
                                            min={256}
                                            max={1024}
                                            step={64}
                                            onChange={v => setGen(g => ({ ...g, height: Number(v) }))}
                                        />
                                    </div>
                                </div>
                                <Button
                                    appearance="primary"
                                    loading={genBusy}
                                    disabled={!gen.model || !effectiveSourceImage || genBusy}
                                    onClick={handleGenerateFromSource}
                                >
                                    {gen.status === 'polling' ? 'Generating…' : 'Generate thumbnail'}
                                </Button>
                            </div>
                            {renderGenerationResult()}
                        </div>
                    ) : (
                        <div className="imggen-panel">
                            <div className="imggen-form">
                                <div className="imggen-mode-row">
                                    <Button
                                        appearance={gen.workflow === 'txt2img' ? 'primary' : 'ghost'}
                                        size="sm"
                                        onClick={() => setGen(g => {
                                            const models = g.txt2imgModels;
                                            const model = models.includes(g.model) ? g.model : (models[0] ?? g.model);
                                            return { ...g, workflow: 'txt2img', model };
                                        })}
                                    >
                                        txt2img
                                    </Button>
                                    <Button
                                        appearance={gen.workflow === 'img2img' ? 'primary' : 'ghost'}
                                        size="sm"
                                        onClick={() => setGen(g => {
                                            const models = g.img2imgModels;
                                            const model = models.includes(g.model) ? g.model : (models[0] ?? g.model);
                                            return { ...g, workflow: 'img2img', model };
                                        })}
                                    >
                                        img2img
                                    </Button>
                                </div>
                                <div className="imggen-field">
                                    <label>Model</label>
                                    <SelectPicker
                                        data={(gen.workflow === 'txt2img' ? gen.txt2imgModels : gen.img2imgModels)
                                            .map(m => ({ label: m.replace('imggen.', ''), value: m }))}
                                        value={gen.model}
                                        onChange={v => setGen(g => ({ ...g, model: v ?? '' }))}
                                        cleanable={false}
                                        searchable={false}
                                        placeholder={gen.modelsLoaded ? 'No available models' : 'Loading models…'}
                                        block
                                    />
                                </div>
                                <div className="imggen-field">
                                    <div className="imggen-label-row">
                                        <label>Prompt</label>
                                        <PromptHistory
                                            project={storageProject}
                                            workflow="image"
                                            onPick={v => setGen(g => ({ ...g, prompt: v }))}
                                            size="xs"
                                        />
                                    </div>
                                    <Input
                                        as="textarea"
                                        rows={4}
                                        value={gen.prompt}
                                        onChange={v => setGen(g => ({ ...g, prompt: v }))}
                                        placeholder="Describe the image…"
                                    />
                                </div>
                                {gen.workflow === 'img2img' && (
                                    <div className="imggen-field imggen-input-section">
                                        <label>Input image</label>
                                        <div className="imggen-input-actions">
                                            <Button
                                                size="sm"
                                                loading={uploading}
                                                onClick={() => imggenInputFileRef.current?.click()}
                                            >
                                                Upload
                                            </Button>
                                            {gen.inputImage && (
                                                <Button
                                                    size="sm"
                                                    appearance="subtle"
                                                    onClick={() => setGen(g => ({ ...g, inputImage: '' }))}
                                                >
                                                    Clear
                                                </Button>
                                            )}
                                            <input
                                                ref={imggenInputFileRef}
                                                type="file"
                                                accept={exts.map(e => `.${e}`).join(',')}
                                                style={{ display: 'none' }}
                                                onChange={handleImggenInputUpload}
                                            />
                                        </div>
                                        {gen.inputImage && imggenInputFullUrl && (
                                            <button
                                                type="button"
                                                className="imggen-input-preview"
                                                title={gen.inputImage}
                                                onClick={() => setFullscreenSrc(imggenInputFullUrl)}
                                            >
                                                <img src={thumbUrl(gen.inputImage)} alt={gen.inputImage} />
                                                <span>{gen.inputImage}</span>
                                            </button>
                                        )}
                                        <div className="imggen-input-grid">
                                            {images.map(filename => {
                                                const isActive = gen.inputImage === filename;
                                                return (
                                                    <button
                                                        key={filename}
                                                        type="button"
                                                        className={`imggen-input-item${isActive ? ' selected' : ''}`}
                                                        title={filename}
                                                        onClick={() => setGen(g => ({ ...g, inputImage: filename }))}
                                                    >
                                                        <img src={thumbUrl(filename)} alt={filename} />
                                                    </button>
                                                );
                                            })}
                                            {images.length === 0 && (
                                                <div className="imggen-input-empty">No uploads yet</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div className="imggen-field">
                                    <label>Seed (optional)</label>
                                    <Input
                                        value={gen.seed}
                                        onChange={v => setGen(g => ({ ...g, seed: v }))}
                                        placeholder="empty = random"
                                    />
                                </div>
                                <div className="imggen-field">
                                    <label>Negative prompt</label>
                                    <div className="imggen-toggle-row">
                                        <Toggle
                                            checked={gen.overrideNegative}
                                            onChange={checked => setGen(g => ({ ...g, overrideNegative: checked }))}
                                        />
                                        <span>{gen.overrideNegative ? 'Override enabled' : 'Use model default'}</span>
                                    </div>
                                    {gen.overrideNegative && (
                                        <Input
                                            as="textarea"
                                            rows={2}
                                            value={gen.negativePrompt}
                                            onChange={v => setGen(g => ({ ...g, negativePrompt: v }))}
                                            placeholder="e.g. blurry, low quality"
                                        />
                                    )}
                                </div>
                                <div className="imggen-field">
                                    <label>Size</label>
                                    <div className="imggen-size-presets">
                                        {SIZE_PRESETS.map(p => (
                                            <button
                                                key={p.label}
                                                type="button"
                                                className={`imggen-size-preset${gen.width === p.w && gen.height === p.h ? ' active' : ''}`}
                                                onClick={() => setGen(g => ({ ...g, width: p.w, height: p.h }))}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="imggen-size-row">
                                        <div className="imggen-field">
                                            <label>Width</label>
                                            <InputNumber
                                                value={gen.width}
                                                min={256}
                                                max={2048}
                                                step={64}
                                                onChange={v => setGen(g => ({ ...g, width: Number(v) }))}
                                            />
                                        </div>
                                        <div className="imggen-field">
                                            <label>Height</label>
                                            <InputNumber
                                                value={gen.height}
                                                min={256}
                                                max={2048}
                                                step={64}
                                                onChange={v => setGen(g => ({ ...g, height: Number(v) }))}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <details className="imggen-advanced">
                                    <summary>Offload rescale (disabled by default)</summary>
                                    <div className="imggen-advanced-body">
                                        <div className="imggen-toggle-row">
                                            <Toggle
                                                checked={gen.dataPreparationEnabled}
                                                onChange={checked => setGen(g => ({ ...g, dataPreparationEnabled: checked }))}
                                            />
                                            <span>Enable dataPreparation</span>
                                        </div>
                                        {gen.dataPreparationEnabled && (
                                            <>
                                                <div className="imggen-mode-row">
                                                    <Button
                                                        appearance={gen.dataPreparationMode === 'exact' ? 'primary' : 'ghost'}
                                                        size="xs"
                                                        onClick={() => setGen(g => ({ ...g, dataPreparationMode: 'exact' }))}
                                                    >
                                                        exact
                                                    </Button>
                                                    <Button
                                                        appearance={gen.dataPreparationMode === 'max' ? 'primary' : 'ghost'}
                                                        size="xs"
                                                        onClick={() => setGen(g => ({ ...g, dataPreparationMode: 'max' }))}
                                                    >
                                                        max
                                                    </Button>
                                                </div>
                                                {gen.dataPreparationMode === 'exact' ? (
                                                    <div className="imggen-size-row">
                                                        <div className="imggen-field">
                                                            <label>Prep width</label>
                                                            <InputNumber
                                                                value={gen.dataPreparationWidth}
                                                                min={64}
                                                                max={4096}
                                                                step={64}
                                                                onChange={v => setGen(g => ({ ...g, dataPreparationWidth: Number(v) }))}
                                                            />
                                                        </div>
                                                        <div className="imggen-field">
                                                            <label>Prep height</label>
                                                            <InputNumber
                                                                value={gen.dataPreparationHeight}
                                                                min={64}
                                                                max={4096}
                                                                step={64}
                                                                onChange={v => setGen(g => ({ ...g, dataPreparationHeight: Number(v) }))}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="imggen-size-row">
                                                        <div className="imggen-field">
                                                            <label>Max px</label>
                                                            <Input
                                                                value={gen.dataPreparationPx}
                                                                onChange={v => setGen(g => ({ ...g, dataPreparationPx: v }))}
                                                            />
                                                        </div>
                                                        <div className="imggen-field">
                                                            <label>Max mp</label>
                                                            <Input
                                                                value={gen.dataPreparationMp}
                                                                onChange={v => setGen(g => ({ ...g, dataPreparationMp: v }))}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </details>
                                <details className="imggen-advanced">
                                    <summary>Comfy params (optional JSON passthrough)</summary>
                                    <div className="imggen-advanced-body">
                                        <div className="imggen-toggle-row">
                                            <Toggle
                                                checked={gen.comfyParamsEnabled}
                                                onChange={checked => setGen(g => ({ ...g, comfyParamsEnabled: checked }))}
                                            />
                                            <span>Enable extra payload params</span>
                                        </div>
                                        {gen.comfyParamsEnabled && (
                                            <Input
                                                as="textarea"
                                                rows={3}
                                                value={gen.comfyParamsJson}
                                                onChange={v => setGen(g => ({ ...g, comfyParamsJson: v }))}
                                                placeholder='{"cfg_scale": 3.5, "steps": 28}'
                                            />
                                        )}
                                    </div>
                                </details>
                                <Button
                                    appearance="primary"
                                    loading={genBusy}
                                    disabled={
                                        !gen.model ||
                                        !gen.prompt.trim() ||
                                        genBusy ||
                                        (gen.workflow === 'img2img' && !gen.inputImage)
                                    }
                                    onClick={handleGenerate}
                                >
                                    {gen.status === 'polling' ? 'Generating…' : 'Generate'}
                                </Button>
                            </div>
                            {renderGenerationResult()}
                        </div>
                    )}
                </div>
            </Modal.Body>
            <Modal.Footer>
                <div className="image-picker-modal-footer">
                    {source === 'server' && (
                        <>
                            <Button size="sm" loading={uploading} onClick={() => fileInputRef.current?.click()}>
                                Upload image
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={exts.map(e => `.${e}`).join(',')}
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                        </>
                    )}
                    <span className="image-picker-modal-selected-name">{selectedLabel}</span>
                    <div className="image-picker-modal-actions">
                        <Button onClick={handleClear} appearance="subtle">Clear</Button>
                        <Button onClick={onClose} appearance="subtle">Cancel</Button>
                        {source !== 'generate' && source !== 'fromSource' && selected && selectedFullUrl && (
                            <Button appearance="default" onClick={() => setFullscreenSrc(selectedFullUrl)}>
                                Preview
                            </Button>
                        )}
                        {source === 'server' && selected && (
                            <Button
                                onClick={() => handleDeleteServerImage(selected)}
                                appearance="subtle"
                                color="red"
                            >
                                Delete
                            </Button>
                        )}
                        {source !== 'generate' && source !== 'fromSource' && (
                            <Button onClick={handleConfirm} appearance="primary">Select</Button>
                        )}
                    </div>
                </div>
            </Modal.Footer>
        </Modal>

        {fullscreenSrc && createPortal(
            <div className="imggen-fullscreen" onClick={() => setFullscreenSrc(null)}>
                <img src={fullscreenSrc} alt="Preview" onClick={e => e.stopPropagation()} />
            </div>,
            document.body
        )}
    </>
    );
};

export default ImagePickerModal;
