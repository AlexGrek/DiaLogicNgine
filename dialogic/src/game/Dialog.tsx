export default interface Dialog {
    name: string;
    windows: DialogWindow[];
}

export interface SimpleTextGenerator {
    text: string;
}

export enum LinkType {
    Local, Push, Pop
}

export enum LinkEnabled {
    Enabled, Disabled, Invisible
}

export interface DialogLink {
    type: LinkType;
    enabled: LinkEnabled;
    text: string;
    direction?: string;
    textProcessingCode?: string;
    actionCode?: string;
}

export const createDialogLink = () => {
    return {type: LinkType.Local, direction: "", text: "", enabled: LinkEnabled.Enabled}
}

export interface DialogWindow {
    text: string;
    uid: string;
    links: DialogLink[];
}

const renameDialogWindow = (old: DialogWindow, newName: string) => {
    return {...old, uid: newName}
}

export { renameDialogWindow };
