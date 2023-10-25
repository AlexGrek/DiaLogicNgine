import Prop from "./Prop";
import { TextList, emptyTextList } from "./TextList";
import Proxy from "./Proxy"
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
        dontKnowObject: ["what it it"]
    }
}

export interface Reaction {
    simpleText: TextList
    chooseSimpleTextScript?: string
    dialogWindow?: DialogWindowId
}

export interface FactReactionMap {
    reactionType: string | null // use null for default reaction type
    customReactions: {[factid: string]: Reaction}
}


export interface CharacterDialog {
    behavior: Behavior
    links: DialogLink[]
    background: ImageList
    text: TextList
    chooseTextScript?: string
    chooseBgScript?: string
    eventHosts: string[]
}

export const createCharacterDialog = (): CharacterDialog => {
    return {
        behavior: {
            speakingModel: createSpeakingModel()
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
    description: TextList
    dialog?: CharacterDialog
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
        }
    }
}

export function createEmptyRole(uid: string): Role {
    return {
        name: uid,
        props: []
    }
}