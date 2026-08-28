import type { CSSProperties } from 'react';
import {
    ASPECT_RATIO_VALUE,
    AspectRatioId,
    LinkCategoryStyle,
    LinkCategoryStyles,
    DEFAULT_DIALOG_TEXT_BACKGROUND_OPACITY,
    DEFAULT_MENU_PANEL_BORDER_RADIUS,
    DEFAULT_MENU_PANEL_OPACITY,
    DEFAULT_NOTIFICATION_BACKGROUND_OPACITY,
    DEFAULT_NOTIFICATION_BORDER_OPACITY,
    DEFAULT_NOTIFICATION_BORDER_RADIUS,
    DialogTextAlignment,
    FontSizeId,
    InventoryLayout,
    MainMenuLayout,
    RESPONSES_FONT_SIZE_PX,
    ResponseAlignment,
    TEXT_FONT_SIZE_PX,
    VisualsConfiguration,
    createDefaultLinkCategoryStyles,
    createDefaultVisuals,
} from '../../game/GameDescription';
import {
    DialogLink,
    LINK_CATEGORIES,
    LinkCategory,
    LinkIconPlacement,
    resolveLinkCategory,
    resolveLinkIconPlacement,
} from '../../game/Dialog';
import { lightenCssColor } from '../../lib/color';
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

const INVENTORY_LAYOUTS: InventoryLayout[] = ['matrix', 'list', 'popup', 'subwindow', 'scroll'];

function normalizeInventoryLayout(value: unknown): InventoryLayout {
    return INVENTORY_LAYOUTS.includes(value as InventoryLayout) ? value as InventoryLayout : 'matrix';
}

function normalizeAspectRatio(value: unknown): AspectRatioId {
    return value === '9:16' ? '9:16' : '16:9';
}

/** A portrait stage is far narrower than a landscape one, so the same px size reads
 *  much larger on it. Every tier — large and huge included — is scaled down to match. */
export const PORTRAIT_FONT_SCALE = 0.72;

export function fontScaleForAspectRatio(aspectRatio: AspectRatioId): number {
    return aspectRatio === '9:16' ? PORTRAIT_FONT_SCALE : 1;
}

/** Games saved before the start-menu layout option existed have no `layout` field. */
export function resolveMainMenuLayout(value: unknown): MainMenuLayout {
    return value === 'mobile' ? 'mobile' : 'classic';
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return fallback;
    }
    return Math.min(max, Math.max(min, Math.round(value)));
}

/** Keeps only the fields we know about, so a hand-edited game.json cannot inject junk. */
function normalizeLinkCategoryStyle(value: unknown): LinkCategoryStyle {
    if (!value || typeof value !== 'object') return {};
    const raw = value as Record<string, unknown>;
    const style: LinkCategoryStyle = {};
    if (typeof raw.iconId === 'string' && raw.iconId) style.iconId = raw.iconId;
    if (typeof raw.textColor === 'string' && raw.textColor) style.textColor = raw.textColor;
    if (typeof raw.backgroundColor === 'string' && raw.backgroundColor) style.backgroundColor = raw.backgroundColor;
    if (typeof raw.fontId === 'string' && raw.fontId in FONT_CSS) style.fontId = raw.fontId as FontId;
    if (raw.fontSize !== undefined) style.fontSize = normalizeFontSizeId(raw.fontSize);
    if (raw.bold) style.bold = true;
    if (raw.italic) style.italic = true;
    if (raw.uppercase) style.uppercase = true;
    return style;
}

function normalizeLinkCategories(value: unknown): LinkCategoryStyles {
    const raw = (value ?? {}) as Record<string, unknown>;
    const result = createDefaultLinkCategoryStyles();
    for (const category of LINK_CATEGORIES) {
        result[category] = normalizeLinkCategoryStyle(raw[category]);
    }
    return result;
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
    merged.typewriterSpeedMs = clampInt(merged.typewriterSpeedMs, 3, 80, 12);
    merged.textFontSize = normalizeFontSizeId(merged.textFontSize);
    merged.responsesFontSize = normalizeFontSizeId(merged.responsesFontSize);
    merged.menuPanelOpacity = clampInt(merged.menuPanelOpacity, 0, 100, DEFAULT_MENU_PANEL_OPACITY);
    merged.menuPanelBorderRadius = clampInt(merged.menuPanelBorderRadius, 0, 50, DEFAULT_MENU_PANEL_BORDER_RADIUS);
    merged.aspectRatio = normalizeAspectRatio(merged.aspectRatio);
    merged.inventoryLayout = normalizeInventoryLayout(merged.inventoryLayout);
    if (typeof merged.inventoryCustomCss !== 'string') merged.inventoryCustomCss = '';
    merged.linkCategories = normalizeLinkCategories(merged.linkCategories);
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
    const scale = fontScaleForAspectRatio(visuals.aspectRatio);
    return {
        '--player-font-menu': FONT_CSS[visuals.menuFontId],
        '--player-font-text': FONT_CSS[visuals.textFontId],
        '--player-font-responses': FONT_CSS[visuals.responsesFontId],
        '--player-dialog-text-bg': `rgba(4, 4, 4, ${opacity})`,
        '--player-text-font-size': `${Math.round(TEXT_FONT_SIZE_PX[visuals.textFontSize] * scale)}px`,
        '--player-responses-font-size': `${Math.round(RESPONSES_FONT_SIZE_PX[visuals.responsesFontSize] * scale)}px`,
        '--menu-panel-bg-alpha': `${visuals.menuPanelOpacity / 100}`,
        '--menu-panel-border-radius': `${visuals.menuPanelBorderRadius}px`,
        '--player-aspect-ratio': `${ASPECT_RATIO_VALUE[visuals.aspectRatio]}`,
    } as CSSProperties;
}

export function fontSizeOverrideCssVars(
    textFontSize: FontSizeId,
    responsesFontSize: FontSizeId,
    scale = 1,
): CSSProperties {
    return {
        '--player-text-font-size': `${Math.round(TEXT_FONT_SIZE_PX[textFontSize] * scale)}px`,
        '--player-responses-font-size': `${Math.round(RESPONSES_FONT_SIZE_PX[responsesFontSize] * scale)}px`,
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

/* ── Link button categories ──────────────────────────────────────────────────
 * A link's category picks one authored `LinkCategoryStyle`; the style becomes a
 * set of CSS variables on the button, so unset fields fall through to the stock
 * `.dialog-button` look and custom CSS can still override everything.
 */

export function resolveLinkCategoryStyle(
    visuals: VisualsConfiguration,
    category: LinkCategory,
): LinkCategoryStyle {
    return visuals.linkCategories?.[category] ?? {};
}

export function linkCategoryClass(category: LinkCategory): string {
    return `dialog-button--category-${category}`;
}

/** Which icon a link actually shows: its own always wins over the category's. */
export function resolveLinkIcon(
    link: DialogLink,
    style: LinkCategoryStyle,
): { iconId: string; placement: LinkIconPlacement } | null {
    if (link.iconId) {
        return { iconId: link.iconId, placement: resolveLinkIconPlacement(link) };
    }
    if (style.iconId) {
        return { iconId: style.iconId, placement: 'before' };
    }
    return null;
}

/**
 * `special_color` reads its colour off the link itself, so two links in that
 * category can differ; every other category takes the authored category colour.
 */
export function resolveLinkTextColor(
    link: DialogLink,
    category: LinkCategory,
    style: LinkCategoryStyle,
): string | undefined {
    if (category === 'special_color' && link.categoryColor) {
        return link.categoryColor;
    }
    return style.textColor;
}

export function linkCategoryCssVars(
    style: LinkCategoryStyle,
    textColor: string | undefined,
): CSSProperties {
    const vars: Record<string, string> = {};
    if (textColor) {
        vars['--link-text-color'] = textColor;
        vars['--link-text-color-hover'] = lightenCssColor(textColor, 70);
    }
    if (style.backgroundColor) {
        vars['--link-bg-color'] = style.backgroundColor;
        vars['--link-bg-color-hover'] = lightenCssColor(style.backgroundColor, 72);
    }
    if (style.fontId) {
        vars['--link-font'] = FONT_CSS[style.fontId];
    }
    if (style.fontSize) {
        // A ratio rather than a px value, so the player's own text-size setting
        // (which drives --player-responses-font-size) keeps working.
        const ratio = RESPONSES_FONT_SIZE_PX[style.fontSize] / RESPONSES_FONT_SIZE_PX.normal;
        vars['--link-font-size'] = `calc(var(--player-responses-font-size, 20px) * ${ratio})`;
    }
    if (style.bold) vars['--link-font-weight'] = '700';
    if (style.italic) vars['--link-font-style'] = 'italic';
    if (style.uppercase) vars['--link-text-transform'] = 'uppercase';
    return vars as CSSProperties;
}

/** Everything a link button needs to paint itself, resolved in one place. */
export function resolveLinkAppearance(link: DialogLink, visuals: VisualsConfiguration) {
    const category = resolveLinkCategory(link);
    const style = resolveLinkCategoryStyle(visuals, category);
    const textColor = resolveLinkTextColor(link, category, style);
    return {
        category,
        style,
        className: linkCategoryClass(category),
        cssVars: linkCategoryCssVars(style, textColor),
        icon: resolveLinkIcon(link, style),
    };
}
