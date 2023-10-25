import { DialogLink } from "./Dialog"
import { ImageList } from "./ImageList"
import { TextList } from "./TextList"

export default interface Loc {
    displayName: string
    uid: string
    backgrounds: ImageList
    thumbnail?: string
    goto: string[]
    text: TextList
    links: DialogLink[]
    routes: string[]

    // scripting

    isAccessibleScript?: string
    isVisibleScript?: string
    chooseTextScript?: string
    choosebackgroundScript?: string
    onEntryScript?: string

    // events
    eventHosts: string[]
}