import { DialogWindowId } from "../exec/GameState";

export default interface Dialog {
    name: string;
    windows: DialogWindow[];
}

export function createDialog(name: string) {
    let dialog = { name: name, windows: [] }
    return dialog;
}
export interface SimpleTextGenerator {
    text: string;
}

export enum LinkType {
    Local = "local", Push = "push", Pop = "pop", 
    NavigateToLocation = "tolocation", TalkToPerson = "toperson"
}

export enum LinkEnabled {
    Enabled = "enabled", Disabled = "disabled", Invisible = "invisible"
}

export interface DialogLink {
    type: LinkType;
    enabled: LinkEnabled;
    text: string;
    direction?: string;
    qualifiedDirection: DialogWindowId;
    textProcessingCode?: string;
    actionCode?: string;
}

export const createDialogLink = () => {
    return { type: LinkType.Local, direction: "", text: "", enabled: LinkEnabled.Enabled } as DialogLink
}

export interface DialogWindow {
    text: string;
    uid: string;
    links: DialogLink[];
    background?: string;
    entryScript?: string
}

export const createWindow = (uid: string) => {
    return { uid: uid, text: "", links: [] };
}

export const renameDialogWindow = (old: DialogWindow, newName: string) => {
    return { ...old, uid: newName }
}
