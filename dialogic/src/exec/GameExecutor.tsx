import lodash from "lodash";
import Dialog, { DialogLink, DialogWindow, LinkType } from "../game/Dialog";
import { GameDescription } from "../game/GameDescription";
import { DialogWindowId, State } from "./GameState";
import { evaluateAsStateProcessor } from "./Runtime"

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

    private pushLink(direction: DialogWindowId, prevState: State) {
        var newState = lodash.cloneDeep(prevState)
        newState.positionStack.push(prevState.position)
        newState.position = direction
        return newState
    }

    private popLink(prevState: State) {
        var newState = lodash.cloneDeep(prevState)
        var prevPosition = newState.positionStack.pop()
        if (prevPosition) {
            newState.position = prevPosition
            return newState
        } else {
            throw new Error("Attempt to pop while UI stack is empty: " + newState.position.dialog)
        }
    }

    private followLink(state: State, link: DialogLink): State {
        switch (link.type) {
            case (LinkType.Local):
                if (link.direction)
                    return this.goToLocalLink(link.direction, state)
                else
                    return state
            case (LinkType.Push):
                if (link.qualifiedDirection)
                    return this.pushLink(link.qualifiedDirection, state)
                else
                    return state
            case (LinkType.Pop):
                return this.popLink(state)
            default:
                return state
        }
    }

    dialogVariantApply(state: State, link: DialogLink): State {
        var followed = this.followLink(state, link)
        return evaluateAsStateProcessor("console.warn(this); return state;", followed)
    }
}
