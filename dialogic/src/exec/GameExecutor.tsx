import lodash from "lodash";
import Character, { CharacterDialog, getChar } from "../game/Character";
import Dialog, { DialogLink, DialogWindow, LinkType } from "../game/Dialog";
import { GameDescription } from "../game/GameDescription";
import { ImageList, chooseImage } from "../game/ImageList";
import Loc, { getLoc } from "../game/Loc";
import { DialogWindowId, HistoryRecord, State } from "./GameState";
import { tryGetCharById, tryGetDialogWindowById, tryGetLocationById } from "./NavigationUtils";
import { LocRouteRenderView, RenderViewGenerator } from "./RenderView";
import { evaluateAsAnyProcessor, evaluateAsBoolProcessor, evaluateAsStateProcessor } from "./Runtime";
import EventsProcessor from "./EventsProcessor";
import DiscussionProcessor from "./DiscussionProcessor";
import QuestProcessor from "./QuestProcessor";
import GameUiElementsProcessor from "./GameUiElementsProcessor";

const MAX_SHORT_HISTORY_RECORDS = 12 // max entries in state.shortHistory queue
export class GameExecManager {
    game: GameDescription
    renderer: RenderViewGenerator
    events: EventsProcessor
    quests: QuestProcessor
    uiEls: GameUiElementsProcessor

    constructor(game: GameDescription) {
        this.game = game
        this.renderer = new RenderViewGenerator(this)
        this.events = new EventsProcessor(this)
        this.quests = new QuestProcessor(this)
        this.uiEls = new GameUiElementsProcessor(this)
    }

    getCurrentDialogWindow(state: State): Readonly<[Dialog, DialogWindow]> | null {
        return tryGetDialogWindowById(this.game, state.position);
    }

    getCurrentCharDialog(state: State): Readonly<[Character, CharacterDialog]> | null {
        const char = tryGetCharById(this.game, state.position);
        if (char && char.dialog === undefined) {
            console.log("Chosen char has no dialog: " + char.uid)
        }
        if (char == null || char.dialog === undefined) {
            return null
        }
        return [char, char.dialog]
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

    getBoolDecisionWithDefault(instate: State, defaultVal: boolean, script: string | undefined, contextVars?: any) {
        if (script !== undefined && script !== '') {
            const { decision } = evaluateAsBoolProcessor(this.game, script, this, instate, contextVars)
            return decision
        }
        else {
            return defaultVal
        }
    }

    private cutToLastDialog(state: State, kind = 'chardialog'): State | null {
        if (state.positionStack.length === 0) {
            return null
        }
        const foundIndex = state.positionStack.findLastIndex((id) => id.kind === kind)
        if (foundIndex < 0) {
            return null
        }

        // we know that we have found some expected UI widget
        const newState = lodash.cloneDeep(state)
        const newPositions = state.positionStack.slice(0, foundIndex) // exclude foundIndex
        newState.positionStack = newPositions
        newState.position = state.positionStack[foundIndex]
        if (newState.position.kind === 'chardialog') {
            newState.charDialog = newState.position.char
        } else if (newState.position.kind === 'location') {
            newState.location = newState.position.location
        }
        return newState
    }

    private returnLink(prevState: State) {
        var newState = lodash.cloneDeep(prevState)
        const currentPosition = prevState.position
        if (currentPosition.kind === 'chardialog' || prevState.charDialog === null) {
            // if we are in char dialog - we have get back to current location or prev dialog
            // same if we are not in dialog
            const stateWithFoundDialog = this.cutToLastDialog(newState, 'chardialog')
            if (stateWithFoundDialog != null) {
                // go to some previous dialog, we found one
                return stateWithFoundDialog
            }

            if (prevState.location) {
                newState.position = {
                    location: prevState.location,
                    kind: "location"
                }
                newState.charDialog = null
                newState.positionStack = [] // reset position stack when we are going there
                return newState
            } else {
                throw new Error("Attempt to pop while UI stack is empty: " + prevState.position)
            }
        }

        const stateWithFoundDialog = this.cutToLastDialog(newState)
        if (stateWithFoundDialog != null) {
            return stateWithFoundDialog
        }

        if (prevState.charDialog) {
            newState.position = {
                char: prevState.charDialog,
                kind: "chardialog"
            }
            newState.positionStack = []
            return newState
        } else if (prevState.location) {
            newState.position = {
                location: prevState.location,
                kind: "location"
            }
            newState.positionStack = []
            return newState
        } else {
            throw new Error("Attempt to pop while UI stack is empty: " + newState.position)
        }
    }

    private popLink(prevState: State) {
        var newState = lodash.cloneDeep(prevState)
        var prevPosition = newState.positionStack.pop()
        if (prevPosition) {
            newState.position = prevPosition
            return newState
        } else if (prevState.charDialog) {
            newState.position = {
                char: prevState.charDialog,
                kind: "chardialog"
            }
            return newState
        } else if (prevState.location) {
            newState.position = {
                location: prevState.location,
                kind: "location"
            }
            return newState
        } else {
            throw new Error("Attempt to pop while UI stack is empty: " + newState.position)
        }
    }

    private goToLocation(prevState: State, direction?: string | Loc) {
        // remove all the stack
        var newState = lodash.cloneDeep(prevState)
        if (!direction) {
            console.error("Direction is not defined for a location")
            return prevState
        }

        const directionUid = lodash.isString(direction) ? direction : direction.uid
        const directionObject = lodash.isString(direction) ? getLoc(this.game, direction) : direction

        if (!directionObject) {
            console.error("DirectionObject is not defined for a location")
            return prevState
        }

        newState.positionStack = []
        // remove all the short history
        newState.shortHistory = []
        newState.position = {
            location: directionUid,
            kind: "location"
        }
        return this.events.withPossibleEvent(newState);
    }

    locRouteApply(state: State, view: LocRouteRenderView): State {
        const afterLink = this.withChangedLocation(this.withUpdatedStep(state), view.destination)
        return this.executeEntry(afterLink)
    }

    private withChangedLocation(state: State, destination: Loc) {
        const followed = this.goToLocation(state, destination.uid)
        return followed;
    }

    private addToKnownPeople(state: State, charID: string) {
        if (state.knownPeople.includes(charID)) {
            return state
        }
        else {
            state.knownPeople.push(charID)
            return state
        }
    }

    private addAllToKnownPlaces(state: State, loc: Loc) {
        let newState = this.addToKnownPlaces(state, loc.uid)
        const visibleNext = loc.routes.map(locid => {
            const next = getLoc(this.game, locid)
            console.log(`Adding location ${locid} as known`)
            if (next == undefined) {
                return null
            }
            if (next.isVisibleScript) {
                const { decision } = evaluateAsBoolProcessor(this.game, next.isVisibleScript, this, newState)
                if (decision) {
                    // route is visible, may be accessible or not (we don't care)
                    return next.uid
                } else {
                    return null
                }
            }
            return locid
        }).filter(uid => uid != null)
            .map(nonnull => `${nonnull}`)
        visibleNext.forEach((el) => {
            newState = this.addToKnownPlaces(newState, el)
        })
        return newState
    }

    private addToKnownPlaces(state: State, loc: string) {
        if (state.knownPlaces.includes(loc)) {
            return state
        }
        else {
            state.knownPlaces.push(loc)
            return state
        }
    }

    private executeEntry(state: State) {
        let newState = state
        const location = this.getCurrentLocation(state)
        if (location != null) {
            newState = this.modifyStateScript(state, location.onEntryScript)
            newState = this.withUpdatedBackground(newState, location.backgrounds, location.choosebackgroundScript)
            newState.location = location.uid
            // add this location and all visible routes to known places
            newState = this.addAllToKnownPlaces(newState, location)
            return newState
        }

        const charDialog = this.getCurrentCharDialog(state)
        if (charDialog != null) {
            const [char, dialog] = charDialog
            newState = this.withUpdatedBackground(state, dialog.background, dialog.chooseBgScript)
            newState.charDialog = char.uid
            newState = this.addToKnownPeople(newState, char.uid)
            return newState
        }

        const dw = this.getCurrentDialogWindow(state)
        if (dw != null) {
            const [_, window] = dw
            newState = state
            if (window.backgrounds.main) {
                newState = this.withUpdatedBackground(state, window.backgrounds, window.chooseBackgroundScript)
            }
            newState = this.modifyStateScript(newState, window.entryScript)
            if (window.changeLocationInBg) {
                newState.location = window.changeLocationInBg
            }
            return newState
        }

        return newState
    }

    followLink(prevState: State, link: DialogLink): State {
        var newState = this.withUpdatedStep(prevState)
        var directionFromLink = link.mainDirection
        if (link.isAlternativeLink && link.alternativeDirections.length > 0 && link.useAlternativeWhen) {
            const { state, decision } = evaluateAsBoolProcessor(this.game, link.useAlternativeWhen, this, newState)
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
            case (LinkType.QuickReply):
                if (directionFromLink.replyText !== undefined) {
                    return this.quickReply(newState, directionFromLink.replyText)
                }
                else
                    return newState
            case (LinkType.Return):
                return this.returnLink(newState)
            case (LinkType.NavigateToLocation):
                return this.goToLocation(newState, directionFromLink.direction)
            case (LinkType.TalkToPerson):
                return this.goToCharDialog(newState, directionFromLink.direction)
            default:
                return newState
        }
    }

    goToCharDialog(prevState: State, direction: string | undefined): State {
        if (direction === undefined) {
            console.error(`Link direction is not defined`)
            return prevState
        }

        var newState = lodash.cloneDeep(prevState)

        const directionUid = direction
        const directionObject = lodash.isString(direction) ? getChar(this.game, direction) : direction

        if (!directionObject) {
            console.error("DirectionObject is not defined for a location")
            return prevState
        }

        const dialog = directionObject.dialog

        if (dialog === undefined) {
            console.error(`Char has no dialog`)
            return prevState
        }

        newState.positionStack.push(prevState.position)
        // remove all the short history
        newState.shortHistory = []
        newState.position = {
            char: directionUid,
            kind: "chardialog"
        }
        newState.charDialog = directionUid

        newState = this.withUpdatedBackground(newState, dialog.background, dialog.chooseBgScript)

        return newState;
    }

    private quickReply(prevState: State, replyText: string): State {
        return { ...prevState, quickReplyText: replyText }
    }

    private withUpdatedHistory(state: State, clickData: HistoryRecord): State {
        // also changes step value
        var s = lodash.cloneDeep(state)
        if (s.shortHistory.length > MAX_SHORT_HISTORY_RECORDS) {
            s.shortHistory.shift() // remove latest entry
        }
        s.shortHistory.push(clickData)
        return s
    }

    private withUpdatedStep(state: State): State {
        // also clears quickReply as it was for the previous step
        var s = lodash.cloneDeep(state)
        s.stepCount = s.stepCount + 1
        s.quickReplyText = null
        return s
    }

    withUpdatedBackground(state: State, backgroundList: ImageList, script?: string) {
        const newbackground = this.getCurrentbackground(state, backgroundList, script)
        // console.log("New background: " + newbackground)
        state.background = newbackground
        return state
    }

    modifyStateScript(instate: State, script?: string): State {
        if (script) {
            return evaluateAsStateProcessor(this.game, script, this, instate)
        }
        return instate
    }

    getCurrentbackground(instate: State, backgrounds: ImageList, chooseBackgroundScript: string | undefined): string | undefined {
        const main = backgrounds.main
        if (chooseBackgroundScript) {
            const { decision } = evaluateAsAnyProcessor(this.game, chooseBackgroundScript, this, instate)
            return chooseImage(backgrounds, decision)
        }
        return main
    }

    applyLink(state: State, link: DialogLink, clickData: HistoryRecord): State {
        // execute code if needed BEFORE link is followed
        let modifiedState = state
        if (link.actionCode) {
            modifiedState = evaluateAsStateProcessor(this.game, link.actionCode, this, modifiedState)
        }
        modifiedState = this.withUpdatedHistory(this.followLink(modifiedState, link), clickData)
        return modifiedState;
    }

    dialogVariantApply(state: State, link: DialogLink, clickData: HistoryRecord): State {
        const afterLink = this.applyLink(state, link, clickData)
        const afterWindowUpd = this.executeEntry(afterLink)
        return afterWindowUpd
    }

    discuss(state: State, category: DiscussionTopicType, id: string, charUid: string): State {
        const disc = new DiscussionProcessor(this)
        const char = getChar(this.game, charUid)
        if (!char) {
            return this.stateError(state, `Error: char ${charUid} not found`)
        }
        if (!char.dialog) {
            return this.stateError(state, `Error: char ${charUid} has no dialog`)
        }
        let link = disc.unknownReaction()
        if (category === "char") {
            link = disc.ofChar(id, char.dialog, state)
        }
        if (category === "fact") {
            link = disc.ofFact(id, char.dialog, state)
        }
        if (category === "item") {
            link = disc.ofItem(id, char.dialog, state)
        }
        if (category === "loc") {
            link = disc.ofLoc(id, char.dialog, state)
        }
        const afterLink = this.followLink(state, link)
        const afterWindowUpd = this.executeEntry(afterLink)
        return afterWindowUpd
    }

    stateError(state: State, message: string, exception?: any) {
        const newState = lodash.cloneDeep(state)
        newState.fatalError = { message: message, exception: exception }
        return newState
    }
}

export type DiscussionTopicType = "char" | "loc" | "item" | "fact"
