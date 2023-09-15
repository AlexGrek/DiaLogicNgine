import lodash from "lodash";
import Dialog, { DialogLink, DialogWindow, LinkType } from "../game/Dialog";
import { GameDescription } from "../game/GameDescription";
import { DialogWindowId, HistoryRecord, State } from "./GameState";
import { evaluateAsStateProcessor } from "./Runtime"
import Loc from "../game/Loc";

const MAX_SHORT_HISTORY_RECORDS = 12 // max entries in state.shortHistory queue
export class GameExecManager {

    game: GameDescription

    constructor(game: GameDescription) {
        this.game = game
    }

    getCurrentDialogWindow(state: State): Readonly<[Dialog, DialogWindow]> | null {
        if (state.position.kind === "window") {
            const expectedDialog = state.position.dialog
            const expectedWindow = state.position.window
            const dialog = this.game.dialogs.find(d => d.name === expectedDialog)
            if (dialog === undefined)
                return null
            const window = dialog?.windows.find(w => w.uid === expectedWindow)
            if (window === undefined)
                return null
            return [dialog, window]
        }
        return null
    }

    getCurrentLocation(state: State): Readonly<Loc> | null {
        if (state.position.kind === "location") {
            const expectedWindow = state.position.location
            const found = this.game.locs.find(loc => loc.uid === expectedWindow)
            if (!found) {
                console.error(`Location ${expectedWindow} was not found in ${JSON.stringify(this.game.locs)}`)
                return null
            }
            return found
        }
        return null;
    }

    private goToLocalLink(directionName: string, prevState: State) {
        var newState = lodash.cloneDeep(prevState)
        if (newState.position.kind === "window") {
            newState.position.window = directionName
        }
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
            throw new Error("Attempt to pop while UI stack is empty: " + newState.position)
        }
    }

    private goToLocation(prevState: State, direction?: string) {
        // remove all the stack
        var newState = lodash.cloneDeep(prevState)
        if (!direction) {
            console.error("Direction is not defined for a location")
            return prevState
        }
        newState.positionStack = []
        // remove all the short history
        newState.shortHistory = []
        newState.position = {
            location: direction,
            kind: "location"
        }
        return newState;
    }

    private followLink(state: State, link: DialogLink): State {
        const directionFromLink = link.mainDirection // TODO: make it possible to choose
        switch (directionFromLink.type) {
            case (LinkType.Local):
                if (directionFromLink.direction)
                    return this.goToLocalLink(directionFromLink.direction, state)
                else
                    return state
            case (LinkType.Push):
                if (directionFromLink.qualifiedDirection)
                    return this.pushLink(directionFromLink.qualifiedDirection, state)
                else
                    return state
            case (LinkType.Pop):
                return this.popLink(state)
            case (LinkType.NavigateToLocation):
                return this.goToLocation(state, directionFromLink.direction)
            default:
                return state
        }
    }

    withUpdatedHistory(state: State, clickData: HistoryRecord): State {
        // also changes step value
        var s = lodash.cloneDeep(state)
        s.stepCount = s.stepCount + 1
        if (s.shortHistory.length > MAX_SHORT_HISTORY_RECORDS) {
            s.shortHistory.shift() // remove latest entry
        }
        s.shortHistory.push(clickData)
        return s
    }

    executeWindowOnEntry(state: State): State {
        const dw = this.getCurrentDialogWindow(state)
        if (dw != null) {
            const [_, window] = dw
            if (window.background) {
                state.background = window.background
            }
        }
        return state
    }

    applyLink(state: State, link: DialogLink, clickData: HistoryRecord): State {
        var followed = this.withUpdatedHistory(this.followLink(state, link), clickData)
        if (link.actionCode) {
            return evaluateAsStateProcessor(link.actionCode, followed)
        }
        return followed;
    }

    dialogVariantApply(state: State, link: DialogLink, clickData: HistoryRecord): State {
        const afterLink = this.applyLink(state, link, clickData)
        const afterWindowUpd = this.executeWindowOnEntry(afterLink)
        return afterWindowUpd
    }
}
