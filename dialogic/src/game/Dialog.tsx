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
    Local, Push, Pop, NavigateToLocation, TalkToPerson
}

export enum LinkEnabled {
    Enabled, Disabled, Invisible
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
