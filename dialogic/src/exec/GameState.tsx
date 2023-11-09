import { GameDescription } from "../game/GameDescription"
import { GameProgress, createInitialGameProgress } from "./GameProgress"

export type InGameNotificationType = "questnew" | "questfailed" | "questcompleted" | "questprogress" | "questlineopen" | "questlineclose"

export interface InGameNotification {
    type: InGameNotificationType
    text: string
    item?: string
}

export function createInGameNotification(type: InGameNotificationType, text: string, item?: string) {
    return {
        type: type,
        text: text,
        item: item
    }
}

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
    charDialog: string | null
    props: { [key: string]: any }
    fatalError?: FatalError | null
    shortHistory: HistoryRecord[]
    gameVersion: string
    background?: string
    knownFacts: string[]
    knownPeople: string[]
    knownPlaces: string[]
    progress: GameProgress
    quickReplyText: string | null
    engineVersion: string
    notifications: InGameNotification[]
}

export function createInitialState(game: GameDescription): State {
    return {
        position: game.startupDialog,
        quickReplyText: null,
        positionStack: [],
        location: null,
        charDialog: null,
        props: {},
        stepCount: 0,
        fatalError: null,
        shortHistory: [],
        gameVersion: game.general.version,
        knownFacts: [],
        knownPeople: [],
        knownPlaces: [],
        engineVersion: game.engineVersion,
        progress: createInitialGameProgress(),
        notifications: []
    }
}

export function safeStateUpdate(safeState: State, upd: State): State {
    safeState.knownFacts = upd.knownFacts
    safeState.knownPeople = upd.knownFacts
    safeState.knownPlaces = upd.knownPlaces
    safeState.progress = upd.progress
    safeState.notifications = upd.notifications
    safeState.background = upd.background
    safeState.charDialog = upd.charDialog
    safeState.location = upd.location
    safeState.fatalError = upd.fatalError
    safeState.props = upd.props
    safeState.quickReplyText = upd.quickReplyText
    safeState.stepCount = upd.stepCount

    // UI stack and position is NOT UPDATED
    // same for short history

    return safeState
}