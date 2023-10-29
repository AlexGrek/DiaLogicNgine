import lodash from "lodash";
import Dialog, { DialogLink, DialogWindow, LinkType } from "../game/Dialog";
import { GameDescription } from "../game/GameDescription";
import { DialogWindowId, HistoryRecord, LocationID, State } from "./GameState";
import { evaluateAsAnyProcessor, evaluateAsBoolProcessor, evaluateAsStateProcessor } from "./Runtime"
import Loc, { getLoc } from "../game/Loc";
import { TextList, chooseText } from "../game/TextList";
import { tryGetDialogWindowById, tryGetLocationById } from "./NavigationUtils";
import { ImageList, chooseImage } from "../game/ImageList";
import { ActorView, BgChange, DialogRenderView, LocRouteRenderView, LocationRenderView, RenderLink, RenderView, RenderWidget } from "./RenderView";
import LocationPreview from "../components/menuitems/locedit/LocationPreview";

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
        return this.getCurrentText(window.text, instate, window.chooseTextScript)
    }

    getCurrentWindowLinks(instate: State, window: {links: DialogLink[]}) {
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
        return [decision, 'link disabled reason is not implemented']
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

        const character = this.game.chars.find(item => item.uid === actor.character)
        if (character === undefined) {
            console.error("Cannot find character " + actor.character)
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
            const {state, decision} = evaluateAsBoolProcessor(this.game, script, instate)
            return decision
        }
        else {
            return defaultVal
        }
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
        newState.location = direction
        return newState;
    }

    private followLink(prevState: State, link: DialogLink): State {
        var newState = prevState
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
                const newbackground = this.getCurrentbackground(state, window.backgrounds, window.chooseBackgroundScript)
                state.background = newbackground
            }
        }
        return state
    }

    getCurrentbackground(instate: State, backgrounds: ImageList, chooseBackgroundScript: string | undefined): string | undefined {
        const main = backgrounds.main
        if (chooseBackgroundScript) {
            const {state, decision} = evaluateAsAnyProcessor(this.game, chooseBackgroundScript, instate)
            return chooseImage(backgrounds, decision)
        }
        return main
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
                const {state, decision} = evaluateAsBoolProcessor(this.game, route.isVisibleScript, instate)
                return decision
            }
            return true
        })
        return visibleRoutes.map((route, i) => {
            let disabled = false
            if (route.isAccessibleScript) {
                const {state, decision} = evaluateAsBoolProcessor(this.game, route.isAccessibleScript, instate)
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
