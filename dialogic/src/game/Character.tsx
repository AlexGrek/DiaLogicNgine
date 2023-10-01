import Prop from "./Prop";
import { TextList } from "./TextList";
import Proxy from "./Proxy"

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

export default interface Character {
    uid: string
    displayName: TextList
    traits: string[]
    props: Prop[]
    overrideProps: Prop[]
    startDialog?: Proxy
    roles: string[]
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
        roles: []
    }
}

export function createEmptyRole(uid: string): Role {
    return {
        name: uid,
        props: []
    }
}