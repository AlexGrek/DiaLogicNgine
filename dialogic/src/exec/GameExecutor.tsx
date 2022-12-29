import lodash from "lodash";
import Dialog, { DialogLink, DialogWindow, LinkType } from "../game/Dialog";
import { GameDescription } from "../game/GameDescription";
import { State } from "./GameState";

export class GameExecManager {
    
    game: GameDescription

    constructor(game: GameDescription) {
        this.game = game
    }

    getCurrentDialogWindow(state: State): Readonly<[Dialog, DialogWindow]> | null {
        switch (state.position.kind) {
            case "window":
                const dialog = this.game.dialogs.find(d => d.name === state.position.dialog)
                if (dialog === undefined)
                    return null
                const window = dialog?.windows.find(w => w.uid === state.position.window)
                if (window === undefined)
                    return null
                return [dialog, window]
        }
    }

    private goToLocalLink(directionName: string, prevState: State) {
        var newState = lodash.cloneDeep(prevState)
        newState.position.window = directionName
        return newState
    }

    dialogVariantApply(state: State, link: DialogLink): State {
        switch (link.type) {
            case (LinkType.Local):
                if (link.direction)
                    return this.goToLocalLink(link.direction, state)
                else
                    return state
            default:
                return state
        }
    }
}