import {
    DialogTextAlignment,
    ResponseAlignment,
    VisualsConfiguration,
    createDefaultVisuals,
} from '../../game/GameDescription';

function normalizeDialogTextAlignment(value: unknown): DialogTextAlignment {
    if (value === 'left' || value === 'right' || value === 'full') {
        return value;
    }
    if (value === 'center') {
        return 'full';
    }
    return 'right';
}

export function resolveVisuals(visuals: VisualsConfiguration | undefined): VisualsConfiguration {
    const merged = { ...createDefaultVisuals(), ...visuals };
    merged.dialogTextAlignment = normalizeDialogTextAlignment(merged.dialogTextAlignment);
    return merged;
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
