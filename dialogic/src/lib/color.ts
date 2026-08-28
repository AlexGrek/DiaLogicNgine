/**
 * Small colour helpers shared by the visuals editors. Authored colours are stored
 * as plain CSS strings, so anything hand-written into `game.json` keeps working —
 * these helpers only need to round-trip the subset the editor itself produces
 * (`#rrggbb` and `rgba(r, g, b, a)`).
 */

export interface RgbaColor {
    /** Always normalised to `#rrggbb`. */
    hex: string
    /** 0–1. */
    alpha: number
}

const HEX_SHORT = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i
const HEX_LONG = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i
const RGB_FUNC = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.%]+))?\s*\)$/i

function toHexPair(n: number): string {
    return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
}

/** Parses the colour formats the editor writes; returns null for anything else. */
export function parseCssColor(value: string | undefined): RgbaColor | null {
    if (!value) return null
    const trimmed = value.trim()

    const short = HEX_SHORT.exec(trimmed)
    if (short) {
        return { hex: `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase(), alpha: 1 }
    }

    const long = HEX_LONG.exec(trimmed)
    if (long) {
        return {
            hex: `#${long[1]}${long[2]}${long[3]}`.toLowerCase(),
            alpha: long[4] === undefined ? 1 : parseInt(long[4], 16) / 255,
        }
    }

    const rgb = RGB_FUNC.exec(trimmed)
    if (rgb) {
        const alphaRaw = rgb[4]
        const alpha = alphaRaw === undefined
            ? 1
            : alphaRaw.endsWith('%') ? parseFloat(alphaRaw) / 100 : parseFloat(alphaRaw)
        return {
            hex: `#${toHexPair(parseFloat(rgb[1]))}${toHexPair(parseFloat(rgb[2]))}${toHexPair(parseFloat(rgb[3]))}`,
            alpha: Number.isNaN(alpha) ? 1 : Math.max(0, Math.min(1, alpha)),
        }
    }

    return null
}

/** `#rrggbb` when fully opaque, `rgba(...)` otherwise — both readable in game.json. */
export function toCssColor(hex: string, alpha: number): string {
    const parsed = parseCssColor(hex)
    const base = parsed?.hex ?? '#000000'
    if (alpha >= 1) return base
    const r = parseInt(base.slice(1, 3), 16)
    const g = parseInt(base.slice(3, 5), 16)
    const b = parseInt(base.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 100) / 100})`
}

/**
 * Hover tint. Kept as a `color-mix()` expression so any CSS colour an author typed
 * by hand still works; browsers that reject it simply drop the hover declaration
 * and keep the base colour.
 */
export function lightenCssColor(value: string, percentOfOriginal: number): string {
    return `color-mix(in srgb, ${value} ${percentOfOriginal}%, #ffffff)`
}
