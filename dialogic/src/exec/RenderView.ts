import Character from "../game/Character"
import { Actor, DialogLink, DialogWindow } from "../game/Dialog"
import Loc from "../game/Loc"
import { State } from "./GameState"

export interface ActorView {
    actor: Actor
    avatar?: string
    name: string
    char: Character
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

export interface ErrorView {
    widget: "error"
    errorText: string
}

type BgChangeEffect = 'fast' | 'slow'

export interface BgRenderChange {
    nextbg: string
    effect: BgChangeEffect | null
}

export type RenderWidget = DialogRenderView | LocationRenderView | ErrorView

export type BgChange = BgRenderChange | null

export interface PlayerNotification {
    text: string
}

export interface RenderView {
    uiWidgetView: RenderWidget
    backgroundChange: BgChange
    notifications: PlayerNotification[]
}