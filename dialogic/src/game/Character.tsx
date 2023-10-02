import Prop from "./Prop";
import { TextList } from "./TextList";
import Proxy from "./Proxy"
import { ImageList, emptyImageList } from "./ImageList";
import { GameDescription } from "./GameDescription";

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

export default interface Character {
    uid: string
    displayName: TextList
    traits: string[]
    props: Prop[]
    overrideProps: Prop[]
    startDialog?: Proxy
    roles: string[],
    chooseNameScript?: string
    chooseDescriptionScript?: string
    chooseAvatarScript?: string
    avatar: ImageList
    description: TextList
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