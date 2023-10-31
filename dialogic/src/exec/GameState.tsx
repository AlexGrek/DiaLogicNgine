import { GameDescription } from "../game/GameDescription"
import { GameProgress, createInitialGameProgress } from "./GameProgress"

export interface DialogWindowId {
    kind: "window"
    dialog: string
    window: string
}

export interface LocationID {
    kind: "location"
    location: string
}

export interface CharDialogID {
    kind: "chardialog"
    char: string
}

export function createDialogWindowId(dialog: string, window: string): DialogWindowId {
    return {
        kind: "window", dialog: dialog, window: window
    }
}

export type UiObjectId = DialogWindowId | LocationID | CharDialogID

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
    location: string | null
    props: { [key: string]: any }
    fatalError?: FatalError | null
    shortHistory: HistoryRecord[]
    gameVersion: string
    background?: string
    knownFacts: string[]
    progress: GameProgress
    quickReplyText: string | null
    engineVersion: string
}

export function createInitialState(game: GameDescription): State {
    return {
        position: game.startupDialog,
        quickReplyText: null,
        positionStack: [],
        location: null,
        props: {},
        stepCount: 0,
        fatalError: null,
        shortHistory: [],
        gameVersion: game.general.version,
        knownFacts: [],
        engineVersion: game.engineVersion,
        progress: createInitialGameProgress()
    }
}
