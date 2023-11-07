import { trace } from "../Trace"
import Character, { CharacterDialog, getChar } from "../game/Character"
import { Actor, DialogLink, DialogWindow } from "../game/Dialog"
import { chooseImage } from "../game/ImageList"
import Loc, { getLoc } from "../game/Loc"
import { TextList, chooseText } from "../game/TextList"
import { GameExecManager } from "./GameExecutor"
import { State } from "./GameState"
import { evaluateAsAnyProcessor, evaluateAsBoolProcessor } from "./Runtime"

export interface ActorView {
    actor: Actor
    avatar?: string
    name: string
    char: Character
}

export interface CharInfoRenderView {
    description: string
    name: string
    avatar?: string
}

export interface RenderLink {
    text: string
    disabled: boolean
    disabledReason: string
    link: DialogLink
    index: number
}

export interface DialogRenderView {
    widget: "dialog"
    actor: ActorView | null
    text: string
    links: RenderLink[]
    window: DialogWindow
}

export interface LocRouteRenderView {
    destination: Loc
    name: string
    disabled: boolean
    disabledReason: string
    thumbnail: string | null
    index: number
}

export interface LocationRenderView {
    widget: "location"
    links: RenderLink[]
    location: Loc
    text: string
    routes: LocRouteRenderView[]
    canHostEvents: boolean
}

export interface CharDialogOptions {
    canDiscussChars: boolean
    canDiscussItems: boolean
    canDiscussFacts: boolean
    canDiscussLocations: boolean
    canGiveItemsTo: boolean
}

export interface CharDialogRenderView {
    widget: "char"
    links: RenderLink[]
    char: Character
    dialog: CharacterDialog
    text: string
    dialogOptions: CharDialogOptions
    canHostEvents: boolean
}

export interface ErrorView {
    widget: "error"
    errorText: string
}

type BgChangeEffect = 'fast' | 'slow'

export interface BgRenderChange {
    nextbg: string
    effect: BgChangeEffect | null
}

export type RenderWidget = DialogRenderView | LocationRenderView | CharDialogRenderView | ErrorView

export type BgChange = BgRenderChange | null

export interface PlayerNotification {
    text: string
}

export interface RenderView {
    uiWidgetView: RenderWidget
    backgroundChange: BgChange
    notifications: PlayerNotification[]
    step: number
}

export class RenderViewGenerator {
    exec: GameExecManager

    constructor(exec: GameExecManager) {
        this.exec = exec
    }

    isLinkVisible(link: DialogLink, instate: State) {
        if (link.isVisible === undefined || link.isVisible === '') {
            return true;
        }
        const { decision } = evaluateAsBoolProcessor(this.exec.game, link.isVisible, this.exec, instate)
        return decision
    }

    isLinkDisabled(link: DialogLink, instate: State): Readonly<[boolean, string]> {
        if (link.isEnabled === undefined || link.isEnabled === '') {
            return [false, ''];
        }
        const { decision } = evaluateAsBoolProcessor(this.exec.game, link.isEnabled, this.exec, instate)
        return [!decision, 'link disabled reason is not implemented']
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

    getCurrentWindowText(instate: State, window: DialogWindow) {
        if (instate.quickReplyText) {
            return instate.quickReplyText
        }
        return this.getCurrentText(window.text, instate, window.chooseTextScript)
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

        const character = this.exec.game.chars.find(item => item.uid === charToSeacrh)
        if (character === undefined) {
            console.error("Cannot find character " + charToSeacrh)
            return null
        }

        var avatar = character.avatar.main

        // get avatar from character script
        if (character.chooseAvatarScript) {
            // eslint-disable-next-line
            const { state, decision } = evaluateAsAnyProcessor(this.exec.game, character.chooseAvatarScript, this.exec, instate)
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
            const { state, decision } = evaluateAsAnyProcessor(this.exec.game, character.chooseNameScript, this.exec, instate)
            name = chooseText(character.displayName, decision)
        }

        return {
            actor: actor,
            avatar: avatar,
            name: name,
            char: character
        }
    }

    renderDialog(state: State): DialogRenderView {
        const dw = this.exec.getCurrentDialogWindow(state)
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

    getCurrentText(tlist: TextList, inState: State, script?: string) {
        if (script) {
            // NOTE: All state changes are IGNORED here! Use other functions to change state
            const { state, decision } = evaluateAsAnyProcessor(this.exec.game, script, this.exec, inState)
            return chooseText(tlist, decision)
        }
        return tlist.main
    }

    renderCharDialog(state: State): CharDialogRenderView {
        const c = this.exec.getCurrentCharDialog(state)
        if (c == null) {
            throw Error(`Window ${JSON.stringify(state.position)} was not found`)
        }
        const [char, charDialog] = c

        trace(`QuickReply: ${state.quickReplyText}`)

        // rendering window
        return {
            widget: "char",
            canHostEvents: this.exec.events.canHostEvents(state, charDialog.eventHosts, charDialog.canHostEventsScript),
            text: state.quickReplyText || this.getCurrentText(charDialog.text, state, charDialog.chooseTextScript),
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

    getRoutesForLoc(instate: State, loc: Readonly<Loc>): LocRouteRenderView[] {
        const routeLocs = loc.routes.map(uid => {
            const loc = getLoc(this.exec.game, uid)
            if (!loc) {
                throw `Route to ${uid} cannot be found`
            }
            return loc
        })
        const visibleRoutes = routeLocs.filter(route => {
            if (route.isVisibleScript) {
                const { decision } = evaluateAsBoolProcessor(this.exec.game, route.isVisibleScript, this.exec, instate)
                return decision
            }
            return true
        })
        return visibleRoutes.map((route, i) => {
            let disabled = false
            if (route.isAccessibleScript) {
                const { decision } = evaluateAsBoolProcessor(this.exec.game, route.isAccessibleScript, this.exec, instate)
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

    renderLoc(state: State): LocationRenderView {
        const loc = this.exec.getCurrentLocation(state)

        if (loc == null) {
            throw `Location ${JSON.stringify(state.position)} was not found`
        }

        return {
            widget: "location",
            links: this.getCurrentWindowLinks(state, loc),
            routes: this.getRoutesForLoc(state, loc),
            location: loc,
            text: this.getCurrentText(loc.text, state, loc.chooseTextScript),
            canHostEvents: this.exec.events.canHostEvents(state, loc.eventHosts, loc.canHostEventsScript)
        }
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

    public getCharInfoDescription(state: State, charUid: string): CharInfoRenderView {
        const char = getChar(this.exec.game, charUid)
        if (char === undefined) {
            return { name: "error " + charUid, description: "char not found: " + charUid }
        }
        else {
            try {
                const descr = this.getCurrentText(char.description, state, char.chooseDescriptionScript)
                const name = this.getCurrentText(char.displayName, state, char.chooseNameScript)

                // avatar
                let avatar = char.avatar.main

                // get avatar from character script
                if (char.chooseAvatarScript) {
                    const { decision } = evaluateAsAnyProcessor(this.exec.game, char.chooseAvatarScript, this.exec, state)
                    avatar = chooseImage(char.avatar, decision)
                }
                return {
                    name: name,
                    description: descr,
                    avatar: avatar
                }

            } catch (exception) {
                return { name: "error " + charUid, description: `char error: ${exception}` }
            }
        }
    }
}