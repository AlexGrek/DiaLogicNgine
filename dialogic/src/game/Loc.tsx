import { DialogLink } from "./Dialog"
import { TextList } from "./TextList"

export default interface Loc {
    displayName: string
    uid: string
    background?: string
    thumbnail?: string
    goto: string[]
    text: TextList
    links: DialogLink[]
}