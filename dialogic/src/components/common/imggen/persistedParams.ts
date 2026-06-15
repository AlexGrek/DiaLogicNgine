import { GenState } from './types';

// Generation parameters persisted to localStorage between sessions.
// Everything tunable EXCEPT the prompt (content) and transient runtime fields
// (status, task refs, results, model lists, input image).
export const IMGGEN_PARAMS_KEY = 'dln.imggen.params';

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

export function loadPersistedParams(): Partial<GenState> {
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

export function savePersistedParams(gen: GenState): void {
    try {
        const out: Record<string, unknown> = {};
        for (const k of PERSISTED_PARAM_KEYS) out[k] = gen[k];
        localStorage.setItem(IMGGEN_PARAMS_KEY, JSON.stringify(out));
    } catch {
        // ignore quota / serialization errors
    }
}
