import type { CSSProperties } from 'react';
import {
    DialogTextAlignment,
    ResponseAlignment,
    VisualsConfiguration,
    createDefaultVisuals,
} from '../../game/GameDescription';
import {
    DEFAULT_MENU_FONT_ID,
    DEFAULT_RESPONSES_FONT_ID,
    DEFAULT_TEXT_FONT_ID,
    FONT_CSS,
    type FontId,
} from '../../lib/fonts';

function normalizeDialogTextAlignment(value: unknown): DialogTextAlignment {
    if (value === 'left' || value === 'right' || value === 'full') {
        return value;
    }
    if (value === 'center') {
        return 'full';
    }
    return 'right';
}

function normalizeFontId(value: unknown, fallback: FontId): FontId {
    if (typeof value === 'string' && value in FONT_CSS) {
        return value as FontId;
    }
    return fallback;
}

export function resolveVisuals(visuals: VisualsConfiguration | undefined): VisualsConfiguration {
    const merged = { ...createDefaultVisuals(), ...visuals };
    merged.dialogTextAlignment = normalizeDialogTextAlignment(merged.dialogTextAlignment);
    merged.menuFontId = normalizeFontId(merged.menuFontId, DEFAULT_MENU_FONT_ID);
    merged.textFontId = normalizeFontId(merged.textFontId, DEFAULT_TEXT_FONT_ID);
    merged.responsesFontId = normalizeFontId(merged.responsesFontId, DEFAULT_RESPONSES_FONT_ID);
    return merged;
}

export function playerVisualsCssVars(visuals: VisualsConfiguration): CSSProperties {
    return {
        '--player-font-menu': FONT_CSS[visuals.menuFontId],
        '--player-font-text': FONT_CSS[visuals.textFontId],
        '--player-font-responses': FONT_CSS[visuals.responsesFontId],
    } as CSSProperties;
}

export function dialogWindowViewClass(
    alignment: DialogTextAlignment,
    modifiers: string[] = [],
): string {
    return ['dialog-window-view', `dialog-window-view--text-${alignment}`, ...modifiers].join(' ');
}

export function dialogVariantsClass(alignment: ResponseAlignment): string {
    return `dialog-variants dialog-variants--${alignment}`;
}

export function dialogResponsesClass(alignment: ResponseAlignment): string {
    return `dialog-responses dialog-responses--${alignment}`;
}
