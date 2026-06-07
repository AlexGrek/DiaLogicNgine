export interface PlayerSettings {
    letterByLetter: boolean
    /** Milliseconds between revealed characters (lower = faster). */
    letterByLetterSpeedMs: number
}

export const DEFAULT_PLAYER_SETTINGS: PlayerSettings = {
    letterByLetter: true,
    letterByLetterSpeedMs: 30,
}

export const MIN_LETTER_SPEED_MS = 10
export const MAX_LETTER_SPEED_MS = 80

const STORAGE_KEY = 'dialogicngine_player_settings'

export function loadPlayerSettings(): PlayerSettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
            const parsed = JSON.parse(raw) as Partial<PlayerSettings>
            return {
                ...DEFAULT_PLAYER_SETTINGS,
                ...parsed,
                letterByLetterSpeedMs: clampSpeed(parsed.letterByLetterSpeedMs ?? DEFAULT_PLAYER_SETTINGS.letterByLetterSpeedMs),
            }
        }
    } catch {
        // ignore corrupt storage
    }
    return { ...DEFAULT_PLAYER_SETTINGS }
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
