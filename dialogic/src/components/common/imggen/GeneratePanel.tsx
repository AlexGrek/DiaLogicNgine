import React from 'react';
import { Button, Input, InputNumber, SelectPicker, Toggle } from 'rsuite';
import PromptHistory from '../../ai/PromptHistory';
import { GenState, SIZE_PRESETS } from './types';

interface GeneratePanelProps {
    gen: GenState;
    setGen: React.Dispatch<React.SetStateAction<GenState>>;
    genBusy: boolean;
    storageProject: string;
    images: string[];
    uploading: boolean;
    exts: string[];
    thumbUrl: (filename: string) => string;
    imggenInputFileRef: React.RefObject<HTMLInputElement>;
    imggenInputFullUrl: string | null;
    onImggenInputUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFullscreen: (src: string) => void;
    onGenerate: () => void;
    result: React.ReactNode;
}

/** The full txt2img / img2img generation form. */
const GeneratePanel: React.FC<GeneratePanelProps> = ({
    gen,
    setGen,
    genBusy,
    storageProject,
    images,
    uploading,
    exts,
    thumbUrl,
    imggenInputFileRef,
    imggenInputFullUrl,
    onImggenInputUpload,
    onFullscreen,
    onGenerate,
    result,
}) => (
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
                            onChange={onImggenInputUpload}
                        />
                    </div>
                    {gen.inputImage && imggenInputFullUrl && (
                        <button
                            type="button"
                            className="imggen-input-preview"
                            title={gen.inputImage}
                            onClick={() => onFullscreen(imggenInputFullUrl)}
                        >
                            <img src={thumbUrl(gen.inputImage)} alt={gen.inputImage} />
                            <span>{gen.inputImage}</span>
                        </button>
                    )}
                    <div className="imggen-input-grid">
                        {images.map(filename => (
                            <button
                                key={filename}
                                type="button"
                                className={`imggen-input-item${gen.inputImage === filename ? ' selected' : ''}`}
                                title={filename}
                                onClick={() => setGen(g => ({ ...g, inputImage: filename }))}
                            >
                                <img src={thumbUrl(filename)} alt={filename} />
                            </button>
                        ))}
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
                onClick={onGenerate}
            >
                {gen.status === 'polling' ? 'Generating…' : 'Generate'}
            </Button>
        </div>
        {result}
    </div>
);

export default GeneratePanel;
