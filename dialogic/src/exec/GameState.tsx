import { GameDescription } from "../game/GameDescription"
import { GameProgress, createInitialGameProgress } from "./GameProgress"

export type InGameNotificationType = "questnew" | "questfailed" | "questcompleted" | "questprogress" | "questlineopen" | "questlineclose" | "itemadded" | "itemremoved"

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
    exception?: unknown
}

export interface HistoryRecord {
    actor?: string | null
    text: string
    answer: string
    step: number
}

export interface CarriedItem {
    item: string
    quantity: number
}

export interface State {
    position: UiObjectId
    stepCount: number
    positionStack: UiObjectId[]
    positionHistory: UiObjectId[]
    location: string | null
    charDialog: string | null
    props: { [key: string]: string | number | boolean }
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
    situation?: string
    carriedItems: CarriedItem[]
    happenedEvents: string[]
    /**
     * Every dialog window the player has entered, as `dialog::window` keys
     * (see dialogWindowKey), deduplicated and kept in first-visit order.
     * Filled by GameExecManager.executeEntry AFTER the window entry script has
     * run, so a script can check whether it has been here BEFORE.
     */
    visitedDialogs: string[]
    /**
     * Locations the player actually stood in, in first-visit order. Unlike
     * `knownPlaces` this never includes places merely seen as a route.
     */
    visitedLocations: string[]
    dialogPage: number
}

/** Separator between dialog name and window uid inside State.visitedDialogs keys. */
export const VISITED_DIALOG_SEP = "::"

/** Key of a single dialog window as stored in State.visitedDialogs. */
export function dialogWindowKey(dialog: string, window: string): string {
    return `${dialog}${VISITED_DIALOG_SEP}${window}`
}

/** Visited dialog windows of a state; savegames made before visit tracking have none. */
export function getVisitedDialogs(state: State): string[] {
    return state.visitedDialogs ?? []
}

/** Unique names of dialogs the player has visited at least one window of. */
export function getVisitedDialogNames(state: State): string[] {
    const names = getVisitedDialogs(state).map(key => key.split(VISITED_DIALOG_SEP)[0])
    return [...new Set(names)]
}

/**
 * Was this dialog window visited? Without `window` it answers whether ANY window
 * of the dialog was visited.
 */
export function isDialogVisited(state: State, dialog: string, window?: string): boolean {
    const visited = getVisitedDialogs(state)
    if (window !== undefined) {
        return visited.includes(dialogWindowKey(dialog, window))
    }
    const prefix = `${dialog}${VISITED_DIALOG_SEP}`
    return visited.some(key => key.startsWith(prefix))
}

/** Visited locations of a state; savegames made before visit tracking have none. */
export function getVisitedLocations(state: State): string[] {
    return state.visitedLocations ?? []
}

/** Has the player ever stood in this location? */
export function isLocationVisited(state: State, loc: string): boolean {
    return getVisitedLocations(state).includes(loc)
}

export function createInitialState(game: GameDescription): State {
    return {
        position: game.startupDialog,
        quickReplyText: null,
        positionStack: [],
        positionHistory: [],
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
        notifications: [],
        carriedItems: [],
        happenedEvents: [],
        visitedDialogs: [],
        visitedLocations: [],
        dialogPage: 0
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
    safeState.carriedItems = upd.carriedItems

    // UI stack and position is NOT UPDATED
    // same for short history and the visited dialogs/locations logs (all engine-owned)

    return safeState
}