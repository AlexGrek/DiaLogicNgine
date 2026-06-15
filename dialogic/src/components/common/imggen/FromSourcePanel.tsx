import React from 'react';
import { Button, Input, InputNumber, SelectPicker } from 'rsuite';
import PromptHistory from '../../ai/PromptHistory';
import { DEFAULT_THUMBNAIL_PROMPT, GenState } from './types';

interface FromSourcePanelProps {
    gen: GenState;
    setGen: React.Dispatch<React.SetStateAction<GenState>>;
    genBusy: boolean;
    storageProject: string;
    effectiveSourceImage?: string;
    sourceImageFullUrl: string | null;
    thumbUrl: (filename: string) => string;
    onFullscreen: (src: string) => void;
    onGenerate: () => void;
    result: React.ReactNode;
}

/** "From source image" panel: resize/crop or img2img a thumbnail from a source image. */
const FromSourcePanel: React.FC<FromSourcePanelProps> = ({
    gen,
    setGen,
    genBusy,
    storageProject,
    effectiveSourceImage,
    sourceImageFullUrl,
    thumbUrl,
    onFullscreen,
    onGenerate,
    result,
}) => (
    <div className="imggen-panel">
        <div className="imggen-form">
            <div className="imggen-field">
                <label>Source image</label>
                {effectiveSourceImage && sourceImageFullUrl && (
                    <button
                        type="button"
                        className="imggen-input-preview"
                        title={effectiveSourceImage}
                        onClick={() => onFullscreen(sourceImageFullUrl)}
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
                onClick={onGenerate}
            >
                {gen.status === 'polling' ? 'Generating…' : 'Generate thumbnail'}
            </Button>
        </div>
        {result}
    </div>
);

export default FromSourcePanel;
