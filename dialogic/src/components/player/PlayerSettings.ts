import type { FontSizeId } from '../../game/GameDescription';

export interface PlayerSettings {
    letterByLetter: boolean
    /** Milliseconds between revealed characters (lower = faster). */
    letterByLetterSpeedMs: number
    textFontSize: FontSizeId
    responsesFontSize: FontSizeId
}

export const DEFAULT_PLAYER_SETTINGS: PlayerSettings = {
    letterByLetter: true,
    letterByLetterSpeedMs: 30,
    textFontSize: 'normal',
    responsesFontSize: 'normal',
}

export const MIN_LETTER_SPEED_MS = 10
export const MAX_LETTER_SPEED_MS = 80

const STORAGE_KEY = 'dialogicngine_player_settings'

function normalizeFontSizeId(value: unknown): FontSizeId {
    if (value === 'xsmall' || value === 'small' || value === 'normal' || value === 'large' || value === 'huge') {
        return value;
    }
    return 'normal';
}

export function loadPlayerSettings(gameDefaults?: Partial<PlayerSettings>): PlayerSettings {
    const base: PlayerSettings = { ...DEFAULT_PLAYER_SETTINGS, ...gameDefaults }
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
            const parsed = JSON.parse(raw) as Partial<PlayerSettings>
            return {
                ...base,
                ...parsed,
                letterByLetterSpeedMs: clampSpeed(parsed.letterByLetterSpeedMs ?? base.letterByLetterSpeedMs),
                textFontSize: normalizeFontSizeId(parsed.textFontSize ?? base.textFontSize),
                responsesFontSize: normalizeFontSizeId(parsed.responsesFontSize ?? base.responsesFontSize),
            }
        }
    } catch {
        // ignore corrupt storage
    }
    return base
}

export function savePlayerSettings(settings: PlayerSettings): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...settings,
        letterByLetterSpeedMs: clampSpeed(settings.letterByLetterSpeedMs),
    }))
}

function clampSpeed(ms: number): number {
    return Math.max(MIN_LETTER_SPEED_MS, Math.min(MAX_LETTER_SPEED_MS, Math.round(ms)))
}
