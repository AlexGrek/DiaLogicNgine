import { DialogLink } from "./Dialog"

export default interface Loc {
    displayName: string
    uid: string
    background?: string
    thumbnail?: string
    goto: string[]
    links: DialogLink[]
}