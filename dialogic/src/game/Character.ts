import Prop from "./Prop";
import { TextList, emptyTextList } from "./TextList";
import { ImageList, emptyImageList } from "./ImageList";
import { GameDescription } from "./GameDescription";
import { DialogWindowId } from "../exec/GameState";
import { DialogLink } from "./Dialog";

export interface Trait {
    name: string
    inherits: string[]
    description: string
}

export interface Role {
    name: string
    description?: string
    props: Prop[]
}

export function roleByUid(uid: string, game: GameDescription) {
    const found = game.roles.find((r) => r.name === uid)
    if (found === undefined) {
        console.error("Cannot find role by UID=" + found)
    }
    return found
}

export interface Behavior {
    speakingModel: SpeakingModel
    reactions: Reaction[]
}

export interface SpeakingModel {
    agree: string[]
    deny: string[]
    bye: string[]
    hello: string[]
    dontKnowObject: string[]
    dontKnowChar: string[]
}

const createSpeakingModel = (): SpeakingModel => {
    return {
        agree: ["ok"],
        deny: ["no"],
        bye: ["bye"],
        hello: ["hello"],
        dontKnowChar: ["who is it"],
        dontKnowObject: ["what is it"]
    }
}

export interface ReactionTrigger {
    facts: string[],
    chars: string[],
    items: string[],
    places: string[]
}

export interface Reaction {
    trigger: ReactionTrigger
    reply: string
    actionScript?: string
    isEnabled?: string
    dialogWindow?: DialogWindowId
}

export function createTrigger() {
    return {
        facts: [],
        chars: [],
        items: [],
        places: []
    }
}

export function createReaction(): Reaction {
    return {
        trigger: createTrigger(),
        reply: "",
    }

}

export interface CharacterDialog {
    behavior: Behavior
    links: DialogLink[]
    background: ImageList
    text: TextList
    chooseTextScript?: string
    chooseBgScript?: string
    canHostEventsScript?: string
    eventHosts: string[] | null
}

export const createCharacterDialog = (): CharacterDialog => {
    return {
        behavior: {
            speakingModel: createSpeakingModel(),
            reactions: []
        },
        links: [],
        background: emptyImageList(),
        text: emptyTextList(),
        eventHosts: []
    }
}

export default interface Character {
    uid: string
    displayName: TextList
    traits: string[]
    props: Prop[]
    overrideProps: Prop[]
    roles: string[],
    chooseNameScript?: string
    chooseDescriptionScript?: string
    chooseAvatarScript?: string
    avatar: ImageList
    /** Full-size transparent person images shown on dialog window stages; main = default look. */
    looks?: ImageList
    /** Picks the default look (name or index) when a stage slot does not name one. */
    chooseLookScript?: string
    description: TextList
    dialog?: CharacterDialog
    discussable: boolean
}


export function createEmptyCharacter(uid: string): Character {
    return {
        uid: uid,
        displayName: {
            main: "",
            list: []
        },
        traits: [],
        props: [],
        overrideProps: [],
        roles: [],
        avatar: emptyImageList(),
        description: {
            main: "", list: []
        },
        discussable: true
    }
}

export function createEmptyRole(uid: string): Role {
    return {
        name: uid,
        props: []
    }
}

export function getChar(game: GameDescription, uid: string) {
    return game.chars.find(ch =>  ch.uid === uid)
}

export function getCharEventHostName(ch: Character | undefined) {
    if (ch && ch.dialog) {
        return ch.dialog.eventHosts === null ? null : `char:${ch.uid}`
    }
    return null
}

export function getLocEventHosts(ch: Character | undefined) {
    if (ch && ch.dialog && ch.dialog.eventHosts !== null) {
        const personal = getCharEventHostName(ch)
        return [...ch.dialog.eventHosts, personal]
    }
    return []
}

/** Names a character's looks can be referenced by: "main" plus every named variant. */
export function lookNames(ch: Character | undefined): string[] {
    if (!ch?.looks) return []
    const names = ch.looks.list.map(l => l.name).filter((n): n is string => !!n)
    return ch.looks.main ? ["main", ...names] : names
}

/**
 * Resolve a look reference to an image uri without the "! ERROR" strings chooseImage
 * produces: null/undefined/-1/"main" pick the default look, a number picks by index,
 * a string picks by name. Unknown references resolve to undefined.
 */
export function resolveLookImage(ch: Character, look: unknown): string | undefined {
    const looks = ch.looks
    if (!looks) return undefined
    if (look === undefined || look === null || look === "" || look === "main" || look === -1) {
        return looks.main || undefined
    }
    if (typeof look === "number") {
        return Number.isInteger(look) && look >= 0 ? looks.list[look]?.uri || undefined : undefined
    }
    if (typeof look === "string") {
        return looks.list.find(l => l.name === look)?.uri || undefined
    }
    return undefined
}
