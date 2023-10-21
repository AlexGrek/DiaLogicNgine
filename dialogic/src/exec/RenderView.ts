import Character from "../game/Character"
import { Actor } from "../game/Dialog"
import { State } from "./GameState"

export interface ActorView {
    actor: Actor
    avatar?: string
    name: string
    char: Character
}

export interface DialogRenderView {
    widget: "dialog"
    actor: ActorView | null
}

export interface LocationRenderView {
    widget: "location"
}

export interface RenderView {
    uiWidgetView: DialogRenderView | LocationRenderView
}