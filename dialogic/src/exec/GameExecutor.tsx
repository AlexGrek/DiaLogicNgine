import lodash from "lodash";
import Dialog, { DialogLink, DialogWindow, LinkType } from "../game/Dialog";
import { GameDescription } from "../game/GameDescription";
import { ImageList, chooseImage } from "../game/ImageList";
import Loc, { getLoc } from "../game/Loc";
import { TextList, chooseText } from "../game/TextList";
import { DialogWindowId, HistoryRecord, State, UiObjectId } from "./GameState";
import { tryGetCharById, tryGetDialogWindowById, tryGetLocationById } from "./NavigationUtils";
import { ActorView, BgChange, CharDialogRenderView, DialogRenderView, LocRouteRenderView, LocationRenderView, RenderLink, RenderView, RenderWidget } from "./RenderView";
import { evaluateAsAnyProcessor, evaluateAsBoolProcessor, evaluateAsStateProcessor } from "./Runtime";
import Character, { CharacterDialog, getChar } from "../game/Character";

const MAX_SHORT_HISTORY_RECORDS = 12 // max entries in state.shortHistory queue
export class GameExecManager {
    game: GameDescription

    constructor(game: GameDescription) {
        this.game = game
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

    getCurrentWindowText(instate: State, window: DialogWindow) {
        if (instate.quickReplyText) {
            return instate.quickReplyText
        }
        return this.getCurrentText(window.text, instate, window.chooseTextScript)
    }

    getCurrentWindowLinks(instate: State, window: { links: DialogLink[] }) {
        const visibleLinks = window.links.filter((link => this.isLinkVisible(link, instate)))
        const renderLinks: RenderLink[] = visibleLinks.map((link, index) => {
            const [disabled, reason] = this.isLinkDisabled(link, instate)
            return {
                index: index,
                link: link,
                disabledReason: reason,
                disabled: disabled,
                text: link.text // TODO: support text procesing code
            }
        })
        return renderLinks
    }

    isLinkVisible(link: DialogLink, instate: State) {
        if (link.isVisible === undefined || link.isVisible === '') {
            return true;
        }
        const { state, decision } = evaluateAsBoolProcessor(this.game, link.isVisible, instate)
        return decision
    }

    isLinkDisabled(link: DialogLink, instate: State): Readonly<[boolean, string]> {
        if (link.isEnabled === undefined || link.isEnabled === '') {
            return [false, ''];
        }
        const { state, decision } = evaluateAsBoolProcessor(this.game, link.isEnabled, instate)
        return [!decision, 'link disabled reason is not implemented']
    }

    getCurrentText(tlist: TextList, inState: State, script?: string) {
        if (script) {
            // NOTE: All state changes are IGNORED here! Use other functions to change state
            const { state, decision } = evaluateAsAnyProcessor(this.game, script, inState)
            return chooseText(tlist, decision)
        }
        return tlist.main
    }

    public getCurrentWindowActor(instate: State, window: DialogWindow): ActorView | null {

        const actor = window.actor
        if (!actor) {
            return null
        }

        let charToSeacrh = actor.character

        if (actor.currentCharacter) {
            charToSeacrh = instate.charDialog || ''
        }

        const character = this.game.chars.find(item => item.uid === charToSeacrh)
        if (character === undefined) {
            console.error("Cannot find character " + charToSeacrh)
            return null
        }

        var avatar = character.avatar.main

        // get avatar from character script
        if (character.chooseAvatarScript) {
            // eslint-disable-next-line
            const { state, decision } = evaluateAsAnyProcessor(this.game, character.chooseAvatarScript, instate)
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
            const { state, decision } = evaluateAsAnyProcessor(this.game, character.chooseNameScript, instate)
            name = chooseText(character.displayName, decision)
        }

        return {
            actor: actor,
            avatar: avatar,
            name: name,
            char: character
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

    getBoolDecisionWithDefault(instate: State, defaultVal: boolean, script: string | undefined) {
        if (script !== undefined && script !== '') {
            const { state, decision } = evaluateAsBoolProcessor(this.game, script, instate)
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
        return newState;
    }

    locRouteApply(state: State, view: LocRouteRenderView): State {
        const afterLink = this.withChangedLocation(this.withUpdatedStep(state), view.destination)
        return this.executeEntry(afterLink)
    }

    private withChangedLocation(state: State, destination: Loc) {
        const followed = this.goToLocation(state, destination.uid)
        return followed;
    }

    private executeEntry(state: State) {
        const location = this.getCurrentLocation(state)
        if (location != null) {
            let newState = this.modifyStateScript(state, location.onEntryScript)
            newState = this.withUpdatedBackground(newState, location.backgrounds, location.choosebackgroundScript)
            newState.location = location.uid
            return newState
        }

        const charDialog = this.getCurrentCharDialog(state)
        if (charDialog != null) {
            const [char, dialog] = charDialog
            let newState = this.withUpdatedBackground(state, dialog.background, dialog.chooseBgScript)
            newState.charDialog = char.uid
            return newState
        }

        const dw = this.getCurrentDialogWindow(state)
        if (dw != null) {
            const [_, window] = dw
            let newState = state
            if (window.backgrounds.main) {
                newState = this.withUpdatedBackground(state, window.backgrounds, window.chooseBackgroundScript)
            }
            newState = this.modifyStateScript(newState, window.entryScript)
            if (window.changeLocationInBg) {
                newState.location = window.changeLocationInBg
            }
            return newState
        }

        return state
    }

    private followLink(prevState: State, link: DialogLink): State {
        var newState = this.withUpdatedStep(prevState)
        var directionFromLink = link.mainDirection
        if (link.isAlternativeLink && link.alternativeDirections.length > 0 && link.useAlternativeWhen) {
            const { state, decision } = evaluateAsBoolProcessor(this.game, link.useAlternativeWhen, newState)
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

    private modifyStateScript(instate: State, script?: string): State {
        if (script) {
            return evaluateAsStateProcessor(this.game, script, instate)
        }
        return instate
    }

    getCurrentbackground(instate: State, backgrounds: ImageList, chooseBackgroundScript: string | undefined): string | undefined {
        const main = backgrounds.main
        if (chooseBackgroundScript) {
            const { state, decision } = evaluateAsAnyProcessor(this.game, chooseBackgroundScript, instate)
            return chooseImage(backgrounds, decision)
        }
        return main
    }

    private applyLink(state: State, link: DialogLink, clickData: HistoryRecord): State {
        // execute code if needed BEFORE link is followed
        let modifiedState = state
        if (link.actionCode) {
            modifiedState = evaluateAsStateProcessor(this.game, link.actionCode, modifiedState)
        }
        modifiedState = this.withUpdatedHistory(this.followLink(modifiedState, link), clickData)
        return modifiedState;
    }

    dialogVariantApply(state: State, link: DialogLink, clickData: HistoryRecord): State {
        const afterLink = this.applyLink(state, link, clickData)
        const afterWindowUpd = this.executeEntry(afterLink)
        return afterWindowUpd
    }

    /// RENDERING

    renderDialog(state: State): DialogRenderView {
        const dw = this.getCurrentDialogWindow(state)
        if (dw == null) {
            throw `Window ${JSON.stringify(state.position)} was not found`
        }
        const [dialog, window] = dw

        // rendering window
        return {
            widget: "dialog",
            actor: this.getCurrentWindowActor(state, window),
            text: this.getCurrentWindowText(state, window),
            links: this.getCurrentWindowLinks(state, window),
            window: window
        }
    }

    renderCharDialog(state: State): CharDialogRenderView {
        const c = this.getCurrentCharDialog(state)
        if (c == null) {
            throw Error(`Window ${JSON.stringify(state.position)} was not found`)
        }
        const [char, charDialog] = c

        // rendering window
        return {
            widget: "char",
            canHostEvents: this.canHostEvents(state, charDialog.eventHosts, charDialog.canHostEventsScript),
            text: this.getCurrentText(charDialog.text, state, charDialog.chooseTextScript),
            links: this.getCurrentWindowLinks(state, charDialog),
            char: char,
            dialog: charDialog,
            dialogOptions: {
                canDiscussChars: true,
                canDiscussFacts: true,
                canDiscussItems: true,
                canDiscussLocations: true,
                canGiveItemsTo: true // TODO: make it dynamic
            }
        }
    }

    renderLoc(state: State): LocationRenderView {
        const loc = this.getCurrentLocation(state)

        if (loc == null) {
            throw `Location ${JSON.stringify(state.position)} was not found`
        }

        return {
            widget: "location",
            links: this.getCurrentWindowLinks(state, loc),
            routes: this.getRoutesForLoc(state, loc),
            location: loc,
            text: this.getCurrentText(loc.text, state, loc.chooseTextScript),
            canHostEvents: this.canHostEvents(state, loc.eventHosts, loc.canHostEventsScript)
        }
    }

    canHostEvents(state: State, eventHosts: string[] | null, canHostEventsScript: string | undefined) {
        if (eventHosts == null) {
            return false
        }
        return this.getBoolDecisionWithDefault(state, true, canHostEventsScript)
    }

    getRoutesForLoc(instate: State, loc: Readonly<Loc>): LocRouteRenderView[] {
        const routeLocs = loc.routes.map(uid => {
            const loc = getLoc(this.game, uid)
            if (!loc) {
                throw `Route to ${uid} cannot be found`
            }
            return loc
        })
        const visibleRoutes = routeLocs.filter(route => {
            if (route.isVisibleScript) {
                const { state, decision } = evaluateAsBoolProcessor(this.game, route.isVisibleScript, instate)
                return decision
            }
            return true
        })
        return visibleRoutes.map((route, i) => {
            let disabled = false
            if (route.isAccessibleScript) {
                const { state, decision } = evaluateAsBoolProcessor(this.game, route.isAccessibleScript, instate)
                disabled = !decision
            }

            return {
                index: i,
                name: route.displayName,
                disabled: disabled,
                disabledReason: 'disabled reason not implemented yet', //TODO: implement it
                thumbnail: route.thumbnail ? route.thumbnail : null,
                destination: route
            }
        })
    }

    renderUiWidget(state: State): RenderWidget {
        if (state.fatalError) {
            return {
                widget: "error",
                errorText: "Error: " + JSON.stringify(state.fatalError)
            }
        }

        const currentUiWidget = state.position
        try {
            if (currentUiWidget.kind === "window") {
                return this.renderDialog(state)
            }
            if (currentUiWidget.kind === "location") {
                return this.renderLoc(state)
            }
            if (currentUiWidget.kind === "chardialog") {
                return this.renderCharDialog(state)
            }
        } catch (exception) {
            console.error(exception)
            return {
                widget: "error",
                errorText: "Error while rendering: " + JSON.stringify(exception)
            }
        }
        return {
            widget: "error",
            errorText: "Cannot find UI widget for " + JSON.stringify(state.position)
        }
    }

    public render(state: State, oldbg: string | null): RenderView {
        const bgChange: BgChange = (state.background == undefined || oldbg === state.background) ? null : {
            nextbg: state.background,
            effect: 'fast' //TODO: add more effects
        }
        return {
            uiWidgetView: this.renderUiWidget(state),
            backgroundChange: bgChange,
            notifications: [], //TODO: add notification support
            step: state.stepCount
        }
    }
}
