import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, InputNumber, Modal, SelectPicker } from 'rsuite';
import { useServerImages } from './useServerImages';
import { IMAGES } from './ImagePicker';

interface ImagePickerModalProps {
    open: boolean;
    onClose: () => void;
    value?: string;
    onChange: (val: string | null) => void;
    extensions?: string[];
    projectName?: string;
}

type Source = 'server' | 'local' | 'other' | 'generate';

type GenStatus = 'idle' | 'submitting' | 'polling' | 'done' | 'error';

interface GenState {
    status: GenStatus;
    models: string[];
    modelsLoaded: boolean;
    model: string;
    prompt: string;
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

const DEFAULT_GEN: GenState = {
    status: 'idle',
    models: [],
    modelsLoaded: false,
    model: '',
    prompt: '',
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

const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
    open,
    onClose,
    value,
    onChange,
    extensions,
    projectName = 'default',
}) => {
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
        useServerImages(projectName);

    useEffect(() => {
        if (!open) return;
        setSelected(value ?? null);
        fetchImages();
        fetch('game_assets/list.json')
            .then(r => r.json())
            .then(data => setLocalFiles(Array.isArray(data) ? data : []))
            .catch(() => setLocalFiles([]));
        fetch('/api/v1/projects')
            .then(r => r.json())
            .then(data => {
                const all: string[] = Array.isArray(data.projects) ? data.projects : [];
                const others = all.filter(p => p !== projectName);
                setOtherProjects(others);
                if (others.length > 0 && (otherProject === null || !others.includes(otherProject))) {
                    setOtherProject(others[0]);
                }
            })
            .catch(() => setOtherProjects([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, value, fetchImages, projectName]);

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

    // Load models when switching to generate tab
    useEffect(() => {
        if (source !== 'generate') return;
        if (gen.modelsLoaded) return;
        fetch('/api/v1/imggen/models')
            .then(r => r.json())
            .then((models: string[]) => {
                setGen(g => ({
                    ...g,
                    models,
                    modelsLoaded: true,
                    model: g.model || (models.length > 0 ? models[0] : ''),
                }));
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
                    `/api/v1/imggen/status/${encodeURIComponent(projectName)}/${encodeURIComponent(taskCap)}/${encodeURIComponent(taskId)}/${encodeURIComponent(outputBucket)}`
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
    }, [gen.status, gen.taskCap, gen.taskId, gen.outputBucket, projectName]);

    const handleGenerate = async () => {
        if (!gen.model || !gen.prompt.trim()) return;
        setGen(g => ({ ...g, status: 'submitting', error: null, resultFilename: null }));
        try {
            const r = await fetch('/api/v1/imggen/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_name: projectName,
                    model: gen.model,
                    prompt: gen.prompt,
                    width: gen.width,
                    height: gen.height,
                }),
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
        await handleGenerate();
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
        if (source === 'server') return `/api/v1/projects/${encodeURIComponent(projectName)}/images/${encodeURIComponent(filename)}`;
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
        await uploadFile(file, (name) => {
            fetchImages();
            setSelected(name);
        });
        e.target.value = '';
    };

    const selectedLabel = selected
        ? (selected.startsWith('game_assets/') ? selected.slice('game_assets/'.length) : selected)
        : 'No image selected';

    const genBusy = gen.status === 'submitting' || gen.status === 'polling';

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
                    </div>

                    {source !== 'generate' ? (
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
                    ) : (
                        <div className="imggen-panel">
                            <div className="imggen-form">
                                <div className="imggen-field">
                                    <label>Model</label>
                                    <SelectPicker
                                        data={gen.models.map(m => ({ label: m.replace('imggen.', ''), value: m }))}
                                        value={gen.model}
                                        onChange={v => setGen(g => ({ ...g, model: v ?? '' }))}
                                        cleanable={false}
                                        searchable={false}
                                        placeholder={gen.modelsLoaded ? 'No available models' : 'Loading models…'}
                                        block
                                    />
                                </div>
                                <div className="imggen-field">
                                    <label>Prompt</label>
                                    <Input
                                        as="textarea"
                                        rows={4}
                                        value={gen.prompt}
                                        onChange={v => setGen(g => ({ ...g, prompt: v }))}
                                        placeholder="Describe the image…"
                                    />
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
                                <Button
                                    appearance="primary"
                                    loading={genBusy}
                                    disabled={!gen.model || !gen.prompt.trim() || genBusy}
                                    onClick={handleGenerate}
                                >
                                    {gen.status === 'polling' ? 'Generating…' : 'Generate'}
                                </Button>
                            </div>
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
                                            src={`/api/v1/projects/${encodeURIComponent(projectName)}/images/${encodeURIComponent(gen.resultFilename)}`}
                                            alt="Generated"
                                            onClick={() => setFullscreenSrc(`/api/v1/projects/${encodeURIComponent(projectName)}/images/${encodeURIComponent(gen.resultFilename!)}`)}
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
                                                onClick={() => setFullscreenSrc(`/api/v1/projects/${encodeURIComponent(projectName)}/images/${encodeURIComponent(gen.resultFilename!)}`)}
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
                        {source !== 'generate' && selected && selectedFullUrl && (
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
                        {source !== 'generate' && (
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
