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
    props: Prop[]
}

export default interface Character {
    uid: string
    displayName: TextList
    traits: string[]
    props: Prop[]
    startDialog?: Proxy
}