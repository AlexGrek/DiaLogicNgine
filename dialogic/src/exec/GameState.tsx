import { GameDescription } from "../game/GameDescription"

export interface DialogWindowId {
    kind: "window"
    dialog: string
    window: string
}

export function createDialogWindowId(dialog: string, window: string): DialogWindowId {
    return {
        kind: "window", dialog: dialog, window: window
    }
}

export type UiObjectId = DialogWindowId

export interface State {
    position: UiObjectId
    positionStack: UiObjectId[]
    props: { [key: string]: number | string }
}

export function createInitialState(game: GameDescription): State {
    return {
        position: game.startupDialog,
        positionStack: [],
        props: {}
    }
}
