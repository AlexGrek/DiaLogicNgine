/** Shared types and constants for the image-picker generation subsystem. */

/** Which source tab of the image picker is active. */
export type Source = 'server' | 'local' | 'other' | 'generate' | 'fromSource';

/** Lifecycle of an AI image-generation task. */
export type GenStatus = 'idle' | 'submitting' | 'polling' | 'done' | 'error';

/** Full state of the generation panel (form fields + transient runtime state). */
export interface GenState {
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

export const DEFAULT_THUMBNAIL_PROMPT =
    'game UI thumbnail, square crop, clear focal subject, vibrant colors, clean composition';

export const SIZE_PRESETS = [
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

export const DEFAULT_GEN: GenState = {
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
