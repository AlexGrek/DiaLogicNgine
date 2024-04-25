import { DialogWindowId } from "../exec/GameState"

export default interface GameEvent {
    name: string
    highPriority: boolean
    probability: number
    onEventActionScript?: string
    canHappenScript?: string
    targets: string[]
    link: DialogWindowId | null
}

export function createEvent(name?: string): GameEvent {
    return {
        name: name || "",
        highPriority: false,
        probability: 20,
        targets: [],
        link: null
    }
}

export type EventHost = string

export function createEventHost(uid: string) {
    return {uid: uid}
}