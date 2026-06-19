import { getChar } from "../game/Character";
import { DialogLink, DialogLinkDirection, DialogWindow, LinkType } from "../game/Dialog";
import { GameDescription } from "../game/GameDescription";
import { ImageList } from "../game/ImageList";
import { getLoc } from "../game/Loc";
import { State, UiObjectId } from "./GameState";

/**
 * Returns every image URI worth preloading from the current position: the
 * backgrounds AND character avatars of all dialogs / locations / characters
 * reachable in one navigation step from where the player is now. Background and
 * avatar *variants* (the whole ImageList) are included so script-chosen images
 * are ready too. Results are de-duplicated.
 */
export function getListForPrealoading(game: GameDescription, state: State): string[] {
    const out: string[] = []
    const current = state.position

    if (current.kind === "window") {
        const dialog = game.dialogs.find(d => d.name === current.dialog)
        const window = dialog?.windows.find(w => w.uid === current.window)
        if (window) collectFromLinks(game, state, window.links, current.dialog, out)
    } else if (current.kind === "location") {
        const loc = getLoc(game, current.location)
        if (loc) {
            for (const routeUid of loc.routes) {
                const target = getLoc(game, routeUid)
                if (target) {
                    collectImageList(target.backgrounds, out)
                    if (target.thumbnail) out.push(target.thumbnail)
                }
            }
            collectFromLinks(game, state, loc.links, "", out)
        }
    } else if (current.kind === "chardialog") {
        const char = getChar(game, current.char)
        if (char?.dialog) collectFromLinks(game, state, char.dialog.links, char.uid, out)
    }

    return [...new Set(out.filter(Boolean))]
}

function collectFromLinks(game: GameDescription, state: State, links: DialogLink[], currentDialog: string, out: string[]) {
    for (const link of links) {
        collectFromDirection(game, state, link.mainDirection, currentDialog, out)
        for (const alt of link.alternativeDirections) {
            collectFromDirection(game, state, alt, currentDialog, out)
        }
    }
}

function collectFromDirection(game: GameDescription, state: State, dir: DialogLinkDirection, currentDialog: string, out: string[]) {
    switch (dir.type) {
        case LinkType.Local: {
            const dialog = game.dialogs.find(d => d.name === currentDialog)
            const target = dialog?.windows.find(w => w.uid === dir.direction)
            if (target) collectWindowImages(game, state, target, out)
            break
        }
        case LinkType.Push:
        case LinkType.Jump:
        case LinkType.ResetJump: {
            const qd = dir.qualifiedDirection
            if (qd) {
                const dialog = game.dialogs.find(d => d.name === qd.dialog)
                const target = dialog?.windows.find(w => w.uid === qd.window)
                if (target) collectWindowImages(game, state, target, out)
            }
            break
        }
        case LinkType.NavigateToLocation: {
            const loc = getLoc(game, dir.direction ?? "")
            if (loc) {
                collectImageList(loc.backgrounds, out)
                if (loc.thumbnail) out.push(loc.thumbnail)
            }
            break
        }
        case LinkType.TalkToPerson: {
            collectCharImages(game, dir.direction ?? "", out)
            break
        }
        case LinkType.Pop:
        case LinkType.Return: {
            // best-effort: preload the position we'd return to (top of the stack)
            const top = state.positionStack[state.positionStack.length - 1]
            if (top) collectPositionImages(game, state, top, out)
            break
        }
    }
}

function collectPositionImages(game: GameDescription, state: State, pos: UiObjectId, out: string[]) {
    if (pos.kind === "window") {
        const dialog = game.dialogs.find(d => d.name === pos.dialog)
        const target = dialog?.windows.find(w => w.uid === pos.window)
        if (target) collectWindowImages(game, state, target, out)
    } else if (pos.kind === "location") {
        const loc = getLoc(game, pos.location)
        if (loc) collectImageList(loc.backgrounds, out)
    } else if (pos.kind === "chardialog") {
        collectCharImages(game, pos.char, out)
    }
}

function collectWindowImages(game: GameDescription, state: State, window: DialogWindow, out: string[]) {
    collectImageList(window.backgrounds, out)
    const actor = window.actor
    if (actor) {
        const charUid = actor.currentCharacter ? (state.charDialog ?? "") : actor.character
        const char = getChar(game, charUid)
        if (char) collectImageList(char.avatar, out)
    }
}

function collectCharImages(game: GameDescription, charUid: string, out: string[]) {
    const char = getChar(game, charUid)
    if (!char) return
    collectImageList(char.avatar, out)
    if (char.dialog) collectImageList(char.dialog.background, out)
}

function collectImageList(list: ImageList | undefined, out: string[]) {
    if (!list) return
    if (list.main) out.push(list.main)
    for (const entry of list.list) {
        if (entry.uri) out.push(entry.uri)
    }
}
