import type { CSSProperties } from 'react';
import {
    DEFAULT_DIALOG_TEXT_BACKGROUND_OPACITY,
    DEFAULT_MENU_PANEL_BORDER_RADIUS,
    DEFAULT_MENU_PANEL_OPACITY,
    DEFAULT_NOTIFICATION_BACKGROUND_OPACITY,
    DEFAULT_NOTIFICATION_BORDER_OPACITY,
    DEFAULT_NOTIFICATION_BORDER_RADIUS,
    DialogTextAlignment,
    FontSizeId,
    RESPONSES_FONT_SIZE_PX,
    ResponseAlignment,
    TEXT_FONT_SIZE_PX,
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

function normalizeFontSizeId(value: unknown): FontSizeId {
    if (value === 'xsmall' || value === 'small' || value === 'normal' || value === 'large' || value === 'huge') {
        return value;
    }
    return 'normal';
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return fallback;
    }
    return Math.min(max, Math.max(min, Math.round(value)));
}

export function resolveVisuals(visuals: VisualsConfiguration | undefined): VisualsConfiguration {
    const merged = { ...createDefaultVisuals(), ...visuals };
    merged.dialogTextAlignment = normalizeDialogTextAlignment(merged.dialogTextAlignment);
    merged.menuFontId = normalizeFontId(merged.menuFontId, DEFAULT_MENU_FONT_ID);
    merged.textFontId = normalizeFontId(merged.textFontId, DEFAULT_TEXT_FONT_ID);
    merged.responsesFontId = normalizeFontId(merged.responsesFontId, DEFAULT_RESPONSES_FONT_ID);
    merged.dialogTextBackgroundOpacity = clampInt(merged.dialogTextBackgroundOpacity, 0, 100, DEFAULT_DIALOG_TEXT_BACKGROUND_OPACITY);
    merged.notificationBackgroundOpacity = clampInt(merged.notificationBackgroundOpacity, 0, 100, DEFAULT_NOTIFICATION_BACKGROUND_OPACITY);
    merged.notificationBorderRadius = clampInt(merged.notificationBorderRadius, 0, 50, DEFAULT_NOTIFICATION_BORDER_RADIUS);
    merged.notificationBorderOpacity = clampInt(merged.notificationBorderOpacity, 0, 100, DEFAULT_NOTIFICATION_BORDER_OPACITY);
    merged.typewriterEnabled = Boolean(merged.typewriterEnabled ?? true);
    merged.typewriterSpeedMs = clampInt(merged.typewriterSpeedMs, 10, 80, 30);
    merged.textFontSize = normalizeFontSizeId(merged.textFontSize);
    merged.responsesFontSize = normalizeFontSizeId(merged.responsesFontSize);
    merged.menuPanelOpacity = clampInt(merged.menuPanelOpacity, 0, 100, DEFAULT_MENU_PANEL_OPACITY);
    merged.menuPanelBorderRadius = clampInt(merged.menuPanelBorderRadius, 0, 50, DEFAULT_MENU_PANEL_BORDER_RADIUS);
    if (typeof merged.customCss !== 'string') merged.customCss = '';
    return merged;
}

export function notificationVisualsCssVars(visuals: VisualsConfiguration): CSSProperties {
    const bgOpacity = visuals.notificationBackgroundOpacity / 100;
    const borderOpacity = visuals.notificationBorderOpacity / 100;
    return {
        '--notif-bg': `rgba(30, 30, 32, ${bgOpacity})`,
        '--notif-border-radius': `${visuals.notificationBorderRadius}px`,
        '--notif-border-color': `rgba(255, 255, 255, ${borderOpacity})`,
    } as CSSProperties;
}

export function playerVisualsCssVars(visuals: VisualsConfiguration): CSSProperties {
    const opacity = visuals.dialogTextBackgroundOpacity / 100;
    return {
        '--player-font-menu': FONT_CSS[visuals.menuFontId],
        '--player-font-text': FONT_CSS[visuals.textFontId],
        '--player-font-responses': FONT_CSS[visuals.responsesFontId],
        '--player-dialog-text-bg': `rgba(4, 4, 4, ${opacity})`,
        '--player-text-font-size': `${TEXT_FONT_SIZE_PX[visuals.textFontSize]}px`,
        '--player-responses-font-size': `${RESPONSES_FONT_SIZE_PX[visuals.responsesFontSize]}px`,
        '--menu-panel-bg-alpha': `${visuals.menuPanelOpacity / 100}`,
        '--menu-panel-border-radius': `${visuals.menuPanelBorderRadius}px`,
    } as CSSProperties;
}

export function fontSizeOverrideCssVars(
    textFontSize: FontSizeId,
    responsesFontSize: FontSizeId,
): CSSProperties {
    return {
        '--player-text-font-size': `${TEXT_FONT_SIZE_PX[textFontSize]}px`,
        '--player-responses-font-size': `${RESPONSES_FONT_SIZE_PX[responsesFontSize]}px`,
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
