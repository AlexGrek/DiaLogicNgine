import {
    DialogTextAlignment,
    ResponseAlignment,
    VisualsConfiguration,
    createDefaultVisuals,
} from '../../game/GameDescription';

export function resolveVisuals(visuals: VisualsConfiguration | undefined): VisualsConfiguration {
    return { ...createDefaultVisuals(), ...visuals };
}

export function dialogTextClass(alignment: DialogTextAlignment): string {
    return `dialog-text dialog-text--align-${alignment}`;
}

export function dialogVariantsClass(alignment: ResponseAlignment): string {
    return `dialog-variants dialog-variants--${alignment}`;
}

export function dialogResponsesClass(alignment: ResponseAlignment): string {
    return `dialog-responses dialog-responses--${alignment}`;
}
