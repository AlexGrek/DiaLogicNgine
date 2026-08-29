import { DialogWindowId } from "../exec/GameState";
import { ImageList, emptyImageList } from "./ImageList";
import { TextList, emptyTextList } from "./TextList";

export default interface Dialog {
    name: string;
    windows: DialogWindow[];
}

export function createDialog(name: string) {
    const dialog = { name: name, windows: [] }
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

/** Every direction type, in the order the Visuals editor lists them. */
export const LINK_TYPES: LinkType[] = [
    LinkType.Local, LinkType.Push, LinkType.Pop, LinkType.Jump, LinkType.ResetJump,
    LinkType.NavigateToLocation, LinkType.TalkToPerson, LinkType.QuickReply, LinkType.Return,
]

export const LINK_TYPE_LABELS: Record<LinkType, string> = {
    [LinkType.Local]: "Local",
    [LinkType.Push]: "Push",
    [LinkType.Pop]: "Pop",
    [LinkType.Jump]: "Jump",
    [LinkType.ResetJump]: "Reset jump",
    [LinkType.NavigateToLocation]: "To location",
    [LinkType.TalkToPerson]: "Talk to person",
    [LinkType.QuickReply]: "Quick reply",
    [LinkType.Return]: "Return",
}

export type LinkIconPlacement = "before" | "after"

/**
 * Presentation bucket of a link button. Purely visual: the engine never branches
 * on it — the look of each category is authored once in Visuals → Link buttons.
 *
 * `special_icon` and `special_color` are the two parametrized categories: the
 * former takes its icon from the link's own `iconId`, the latter its colour from
 * the link's own `categoryColor`, so links inside them can differ from each other.
 */
export type LinkCategory =
    "default" | "action" | "question" | "special_icon" | "special_color" |
    "class_a" | "class_b" | "class_c" | "class_d" | "class_e"

export const LINK_CATEGORIES: LinkCategory[] = [
    "default", "action", "question", "special_icon", "special_color",
    "class_a", "class_b", "class_c", "class_d", "class_e",
]

export const LINK_CATEGORY_LABELS: Record<LinkCategory, string> = {
    default: "Default",
    action: "Action",
    question: "Question",
    special_icon: "Special (icon)",
    special_color: "Special (color)",
    class_a: "Class A",
    class_b: "Class B",
    class_c: "Class C",
    class_d: "Class D",
    class_e: "Class E",
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
    iconId?: string
    iconPlacement?: LinkIconPlacement
    /** Visual bucket; styled in Visuals → Link buttons. Absent means "default". */
    category?: LinkCategory
    /** Per-link colour, honoured only by the `special_color` category. */
    categoryColor?: string
}

export function resolveLinkIconPlacement(link: DialogLink): LinkIconPlacement {
    return link.iconPlacement === "after" ? "after" : "before"
}

export function resolveLinkCategory(link: DialogLink): LinkCategory {
    return link.category && LINK_CATEGORIES.includes(link.category) ? link.category : "default"
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

    // special widget types
    specialWidget: string | null
}

export const createWindow = (uid: string) => {
    const window: DialogWindow = { uid: uid, text: emptyTextList(), links: [], backgrounds: emptyImageList(), tags: [], specialWidget: null }
    return window;
}

export const renameDialogWindow = (old: DialogWindow, newName: string) => {
    return { ...old, uid: newName }
}
