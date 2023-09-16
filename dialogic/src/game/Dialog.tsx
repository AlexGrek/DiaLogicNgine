import { DialogWindowId } from "../exec/GameState";
import { TextList, emptyTextList } from "./TextList";

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

export interface DialogLinkDirection {
    direction?: string;
    qualifiedDirection?: DialogWindowId;
    type: LinkType;
}

export interface DialogLink {
    mainDirection: DialogLinkDirection;
    alternativeDirections: DialogLinkDirection[];
    text: string;
    textProcessingCode?: string;
    actionCode?: string;
    isVisible?: string;
    isEnabled?: string;
    isAlternativeLink?: boolean;
    useAlternativeWhen?: string;
}

export function createDialogLink(): DialogLink {
    return { mainDirection: { type: LinkType.Local, direction: "" }, text: "", alternativeDirections: [] }
}

export interface DialogWindow {
    text: TextList
    uid: string
    links: DialogLink[]
    background?: string
    entryScript?: string
    chooseTextScript?: string
    chooseBackgroundScript?: string
}

export const createWindow = (uid: string) => {
    return { uid: uid, text: emptyTextList(), links: [] };
}

export const renameDialogWindow = (old: DialogWindow, newName: string) => {
    return { ...old, uid: newName }
}
