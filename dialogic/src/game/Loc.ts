import { DialogLink } from "./Dialog"
import { GameDescription } from "./GameDescription"
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
    eventHosts?: string[]
}

export function getLoc(game: GameDescription, uid: string) {
    return game.locs.find(loc =>  loc.uid === uid)
}

export function getLocEventHostName(loc: Loc | undefined) {
    if (loc) {
        return loc.eventHosts === undefined ? null : `loc:${loc.uid}`
    }
    return null
}

export function getLocEventHosts(loc: Loc | undefined) {
    if (loc && loc.eventHosts !== undefined) {
        const personal = getLocEventHostName(loc)
        return [...loc.eventHosts, personal]
    }
    return []
}