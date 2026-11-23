import { getChar } from "../game/Character"
import { DialogLink, DialogLinkDirection, LinkType } from "../game/Dialog"
import { GameDescription } from "../game/GameDescription"
import { ImageList } from "../game/ImageList"
import { getLoc, getLocEventHosts } from "../game/Loc"
import { zoneAsDialogLink, zoneHasNavigation } from "../game/PointAndClick"
import { State, UiObjectId } from "./GameState"
import { backDestination, tryGetDialogWindowById } from "./NavigationUtils"
import { RenderWidget } from "./RenderView"

type ImageUri = string | null | undefined

/** Only the assets actually selected by the renderer may delay a scene change. */
export function sceneImages(background: ImageUri, widget: RenderWidget): ImageUri[] {
    switch (widget.widget) {
        case "dialog": return [background, widget.actor?.avatar]
        case "pac": return [background, widget.pac.background, ...widget.items.map(({ zone }) => zone.image)]
        case "location": return [background, ...widget.routes.map(route => route.thumbnail)]
        case "char": return [background]
        case "error": return []
    }
}

/** Inspect declared destinations and variants without evaluating any author scripts. */
export function upcomingImages(game: GameDescription, state: State): ImageUri[] {
    const images: ImageUri[] = [game.startMenu?.menuBackground]
    const current = state.position

    function imageList(list?: ImageList) {
        if (list) images.push(list.main, ...(list.list ?? []).map(entry => entry.uri))
    }

    function windowImages(position: UiObjectId) {
        const window = tryGetDialogWindowById(game, position)?.[1]
        if (!window) return
        imageList(window.backgrounds)
        const actor = window.actor
        if (actor) {
            const uid = actor.currentCharacter ? state.charDialog : actor.character
            if (uid) imageList(getChar(game, uid)?.avatar)
        }
        if (window.specialWidget?.startsWith("pac::")) {
            const pac = game.pacWidgets?.find(p => p.id === window.specialWidget?.slice(5))
            if (pac) images.push(pac.background, ...pac.zones.map(zone => zone.image))
        }
    }

    function destination(pos: UiObjectId | undefined, enteringLocation = false) {
        if (!pos) return
        if (pos.kind === "window") return windowImages(pos)
        if (pos.kind === "chardialog") {
            const char = getChar(game, pos.char)
            imageList(char?.avatar)
            imageList(char?.dialog?.background)
            return
        }
        const loc = getLoc(game, pos.location)
        if (!loc) return
        imageList(loc.backgrounds)
        images.push(loc.thumbnail)
        for (const uid of loc.routes ?? []) images.push(getLoc(game, uid)?.thumbnail)
        if (enteringLocation && loc.eventHosts != null) {
            const hosts = getLocEventHosts(loc)
            for (const event of game.events ?? []) {
                if (event.link && event.targets.some(host => hosts.includes(host))) windowImages(event.link)
            }
        }
    }

    function direction(dir: DialogLinkDirection) {
        switch (dir.type) {
            case LinkType.Local:
                if (current.kind === "window" && dir.direction) destination({ ...current, window: dir.direction })
                break
            case LinkType.Jump:
            case LinkType.Push:
            case LinkType.ResetJump:
                destination(dir.qualifiedDirection)
                break
            case LinkType.TalkToPerson:
                if (dir.direction) destination({ kind: "chardialog", char: dir.direction })
                break
            case LinkType.NavigateToLocation:
                if (dir.direction) destination({ kind: "location", location: dir.direction }, true)
                break
            case LinkType.Pop:
            case LinkType.Return:
                destination(backDestination(state, dir.type)?.position)
                break
        }
    }

    function links(list: DialogLink[] = []) {
        for (const link of list) {
            direction(link.mainDirection)
            link.alternativeDirections?.forEach(direction)
        }
    }

    if (current.kind === "window") {
        const window = tryGetDialogWindowById(game, current)?.[1]
        links(window?.links)
        if (window?.specialWidget?.startsWith("pac::")) {
            const pac = game.pacWidgets?.find(p => p.id === window.specialWidget?.slice(5))
            for (const zone of pac?.zones ?? []) {
                if (zoneHasNavigation(zone)) links([zoneAsDialogLink(zone)])
            }
        }
    } else if (current.kind === "location") {
        const loc = getLoc(game, current.location)
        links(loc?.links)
        for (const uid of loc?.routes ?? []) destination({ kind: "location", location: uid }, true)
    } else if (current.kind === "chardialog") {
        const dialog = getChar(game, current.char)?.dialog
        links(dialog?.links)
        for (const reaction of dialog?.behavior?.reactions ?? []) {
            if (reaction.dialogWindow) windowImages(reaction.dialogWindow)
        }
    }

    const inventory = new Set((state.carriedItems ?? []).map(item => item.item))
    const latestItem = state.notifications?.at(-1)?.item
    if (latestItem) inventory.add(latestItem)
    for (const item of game.items ?? []) {
        if (inventory.has(item.uid)) images.push(item.thumbnail, item.image)
    }
    return images
}
