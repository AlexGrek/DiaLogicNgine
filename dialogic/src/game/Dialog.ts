import { DialogWindowId } from "../exec/GameState";
import { ImageList, emptyImageList } from "./ImageList";
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
    Jump = "jump", ResetJump = "resetjump",
    NavigateToLocation = "tolocation", TalkToPerson = "toperson",
    QuickReply = "reply", Return = "return"
}

export interface DialogLinkDirection {
    direction?: string;
    qualifiedDirection?: DialogWindowId;
    type: LinkType;
    replyText?: string;
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
    changeLocationInBg?: string
}

export function createDialogLink(): DialogLink {
    return { mainDirection: { type: LinkType.Local, direction: "" }, text: "", alternativeDirections: [] }
}

export function createImmediateDialogLink(target: DialogWindowId): DialogLink {
    return { mainDirection: { type: LinkType.Push, direction: "", qualifiedDirection: target }, text: "", alternativeDirections: [] }
}

export interface Actor {
    character: string
    currentCharacter: boolean,
    avatar: string | number | undefined
}

export const createActor = (): Actor => {
    return {
        character: "",
        avatar: undefined,
        currentCharacter: false
    }
}

export interface DialogWindow {
    text: TextList
    uid: string
    links: DialogLink[]
    backgrounds: ImageList
    entryScript?: string
    chooseTextScript?: string
    chooseBackgroundScript?: string
    actor?: Actor
    tags: string[]
    changeLocationInBg?: string
    changeSituation?: string
}

export const createWindow = (uid: string) => {
    const window: DialogWindow = { uid: uid, text: emptyTextList(), links: [], backgrounds: emptyImageList(), tags: [] }
    return window;
}

export const renameDialogWindow = (old: DialogWindow, newName: string) => {
    return { ...old, uid: newName }
}
