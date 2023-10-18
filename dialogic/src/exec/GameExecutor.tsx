import lodash from "lodash";
import Dialog, { DialogLink, DialogWindow, LinkType } from "../game/Dialog";
import { GameDescription } from "../game/GameDescription";
import { DialogWindowId, HistoryRecord, State } from "./GameState";
import { evaluateAsAnyProcessor, evaluateAsBoolProcessor, evaluateAsStateProcessor } from "./Runtime"
import Loc from "../game/Loc";
import { chooseText } from "../game/TextList";
import { tryGetDialogWindowById, tryGetLocationById } from "./NavigationUtils";
import { chooseImage } from "../game/ImageList";

const MAX_SHORT_HISTORY_RECORDS = 12 // max entries in state.shortHistory queue
export class GameExecManager {

    game: GameDescription

    constructor(game: GameDescription) {
        this.game = game
    }

    getCurrentDialogWindow(state: State): Readonly<[Dialog, DialogWindow]> | null {
        return tryGetDialogWindowById(this.game, state.position);
    }

    getCurrentWindowText(instate: State, window: DialogWindow) {
        if (window.chooseTextScript) {
            // NOTE: All state changes are IGNORED here! Use other functions to change state
            const {state, decision} = evaluateAsAnyProcessor(this.game, window.chooseTextScript, instate)
            return chooseText(window.text, decision)
        }
        return window.text.main
    }

    public getCurrentWindowActor(instate: State, window: DialogWindow) {

        const actor = window.actor
        if (!actor) {
            return null
        }
        
        const character = this.game.chars.find(item => item.uid === actor.character)
        if (character === undefined) {
            console.error("Cannot find character " + actor.character)
            return null
        }

        var avatar = character.avatar.main
        
        // get avatar from character script
        if (character.chooseAvatarScript) {
            // eslint-disable-next-line
            const {state, decision} = evaluateAsAnyProcessor(this.game, character.chooseAvatarScript, instate)
            avatar = chooseImage(character.avatar, decision)
        }

        if (actor.avatar !== undefined) {
            // redefined avatar
            console.log("redefined avatar")
            avatar = chooseImage(character.avatar, actor.avatar)
        }

        var name = character.displayName.main

        if (character.chooseNameScript) {
            // eslint-disable-next-line
            const {state, decision} = evaluateAsAnyProcessor(this.game, character.chooseNameScript, instate)
            name = chooseText(character.displayName, decision)
        }

        return {
            actor: actor,
            avatar: avatar,
            name: name,
            char: character
        }
    }

    getLinkVisible(prevState: State, link: DialogLink): boolean {
        if (link.isVisible) {
            const {state, decision} = evaluateAsBoolProcessor(this.game, link.isVisible, prevState)
            return decision;
        } else {
            return true;
        }
    }

    getLinkEnabled(prevState: State, link: DialogLink): boolean {
        if (link.isEnabled) {
            const {state, decision} = evaluateAsBoolProcessor(this.game, link.isEnabled, prevState)
            return decision;
        } else {
            return true;
        }
    }

    getCurrentLocation(state: State): Readonly<Loc> | null {
        return tryGetLocationById(this.game, state.position) 
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

    private jumpLink(direction: DialogWindowId, prevState: State, reset?: boolean) {
        var newState = lodash.cloneDeep(prevState)
        if (reset) {
            newState.positionStack = []
        }
        newState.position = direction
        return newState
    }

    private popLink(prevState: State) {
        var newState = lodash.cloneDeep(prevState)
        var prevPosition = newState.positionStack.pop()
        if (prevPosition) {
            newState.position = prevPosition
            return newState
        } else if (prevState.location) {
            newState.position = {
                location: prevState.location,
                kind: "location"
            }
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
        newState.location = direction
        return newState;
    }

    private followLink(prevState: State, link: DialogLink): State {
        var newState = prevState
        var directionFromLink = link.mainDirection
        if (link.isAlternativeLink && link.alternativeDirections.length > 0 && link.useAlternativeWhen) {
            const {state, decision} = evaluateAsBoolProcessor(this.game, link.useAlternativeWhen, newState)
            newState = state
            if (decision) {
                directionFromLink = link.alternativeDirections[0]
            }
        }

        switch (directionFromLink.type) {
            case (LinkType.Local):
                if (directionFromLink.direction)
                    return this.goToLocalLink(directionFromLink.direction, newState)
                else
                    return newState
            case (LinkType.Push):
                if (directionFromLink.qualifiedDirection)
                    return this.pushLink(directionFromLink.qualifiedDirection, newState)
                else
                    return newState
            case (LinkType.Jump):
                        if (directionFromLink.qualifiedDirection)
                            return this.jumpLink(directionFromLink.qualifiedDirection, newState, false)
                        else
                            return newState
            case (LinkType.ResetJump):
                                if (directionFromLink.qualifiedDirection)
                                    return this.jumpLink(directionFromLink.qualifiedDirection, newState, true)
                                else
                                    return newState
            case (LinkType.Pop):
                return this.popLink(newState)
            case (LinkType.NavigateToLocation):
                return this.goToLocation(newState, directionFromLink.direction)
            default:
                return newState
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
            if (window.backgrounds.main) {
                state.background = window.backgrounds.main
            }
        }
        return state
    }

    applyLink(state: State, link: DialogLink, clickData: HistoryRecord): State {
        var followed = this.withUpdatedHistory(this.followLink(state, link), clickData)
        if (link.actionCode) {
            return evaluateAsStateProcessor(this.game, link.actionCode, followed)
        }
        return followed;
    }

    dialogVariantApply(state: State, link: DialogLink, clickData: HistoryRecord): State {
        const afterLink = this.applyLink(state, link, clickData)
        const afterWindowUpd = this.executeWindowOnEntry(afterLink)
        return afterWindowUpd
    }
}
