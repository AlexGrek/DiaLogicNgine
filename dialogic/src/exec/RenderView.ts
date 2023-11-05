import Character, { CharacterDialog } from "../game/Character"
import { Actor, DialogLink, DialogWindow } from "../game/Dialog"
import Loc from "../game/Loc"
import { State } from "./GameState"

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