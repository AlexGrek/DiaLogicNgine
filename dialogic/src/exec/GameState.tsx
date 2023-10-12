import { GameDescription } from "../game/GameDescription"

export interface DialogWindowId {
    kind: "window"
    dialog: string
    window: string
}

export interface LocationID {
    kind: "location"
    location: string
}

export function createDialogWindowId(dialog: string, window: string): DialogWindowId {
    return {
        kind: "window", dialog: dialog, window: window
    }
}

export type UiObjectId = DialogWindowId | LocationID

export interface FatalError {
    message: string
    exception?: any
}

export interface HistoryRecord {
    actor?: string | null
    text: string
    answer: string
    step: number
}

export interface State {
    position: UiObjectId
    stepCount: number
    positionStack: UiObjectId[]
    props: { [key: string]: any }
    fatalError?: FatalError | null
    shortHistory: HistoryRecord[]
    gameVersion: string
    background?: string
    knownFacts: string[]
}

export function createInitialState(game: GameDescription): State {
    return {
        position: game.startupDialog,
        positionStack: [],
        props: {},
        stepCount: 0,
        fatalError: null,
        shortHistory: [],
        gameVersion: "0.0.1",
        knownFacts: []
    }
}
