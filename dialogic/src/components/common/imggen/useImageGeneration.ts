import React, { useEffect, useRef, useState } from 'react';
import { DEFAULT_GEN, GenState, Source } from './types';
import { loadPersistedParams, savePersistedParams } from './persistedParams';

interface UseImageGenerationParams {
    storageProject: string;
    source: Source;
    effectiveSourceImage?: string;
    deleteImage: (filename: string) => Promise<void>;
    fetchImages: () => void;
    onChange: (val: string | null) => void;
    onClose: () => void;
}

export interface ImageGeneration {
    gen: GenState;
    setGen: React.Dispatch<React.SetStateAction<GenState>>;
    progress: number;
    genBusy: boolean;
    handleGenerate: () => Promise<void>;
    handleGenerateFromSource: () => Promise<void>;
    handleRegenerate: () => Promise<void>;
    handleSelectGenerated: () => void;
    handleDeleteGenerated: () => Promise<void>;
}

/**
 * Encapsulates the AI image-generation subsystem: the `GenState` machine,
 * persistence of tunable params, model discovery, the submit→poll→download
 * lifecycle, and the smoothed progress bar.
 */
export function useImageGeneration({
    storageProject,
    source,
    effectiveSourceImage,
    deleteImage,
    fetchImages,
    onChange,
    onClose,
}: UseImageGenerationParams): ImageGeneration {
    const [gen, setGen] = useState<GenState>(() => ({ ...DEFAULT_GEN, ...loadPersistedParams() }));
    const [progress, setProgress] = useState(0);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const rafRef = useRef<number | null>(null);

    // Persist tunable generation parameters (not the prompt) across sessions.
    useEffect(() => {
        savePersistedParams(gen);
    }, [gen]);

    // Smooth progress bar driven by avg_time.
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

    // Load models when switching to generate or fromSource tab.
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

    // Polling loop.
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

    const handleGenerate = async () => {
        await submitGeneration('full');
    };

    const handleGenerateFromSource = async () => {
        if (!effectiveSourceImage) return;
        await submitGeneration('thumbnail');
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

    const genBusy = gen.status === 'submitting' || gen.status === 'polling';

    return {
        gen,
        setGen,
        progress,
        genBusy,
        handleGenerate,
        handleGenerateFromSource,
        handleRegenerate,
        handleSelectGenerated,
        handleDeleteGenerated,
    };
}
