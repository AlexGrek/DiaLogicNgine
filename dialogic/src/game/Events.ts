export default interface GameEvent {
    name: string
    highPriority: boolean
    probability: number
    onEventActionScript?: string
    canHappenScript?: string
    targets: string[]
}

export function createEvent(name?: string): GameEvent {
    return {
        name: name || "",
        highPriority: false,
        probability: 0.2,
        targets: []
    }
}

export type EventHost = string

export function createEventHost(uid: string) {
    return {uid: uid}
}