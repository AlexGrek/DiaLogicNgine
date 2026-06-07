import { getChar } from "../game/Character";
import { LinkType, DialogLinkDirection } from "../game/Dialog";
import { GameDescription } from "../game/GameDescription";
import { getLoc } from "../game/Loc";
import { State } from "./GameState";

export function getListForPrealoading(game: GameDescription, state: State): string[] {
    const current = state.position
    const uris: string[] = []

    if (current.kind === "window") {
        const dialog = game.dialogs.find(d => d.name === current.dialog)
        if (!dialog) return []
        const window = dialog.windows.find(w => w.uid === current.window)
        if (!window) return []
        for (const link of window.links) {
            collectFromDirection(game, link.mainDirection, current.dialog, uris)
            for (const alt of link.alternativeDirections) {
                collectFromDirection(game, alt, current.dialog, uris)
            }
        }
    } else if (current.kind === "location") {
        const loc = getLoc(game, current.location)
        if (!loc) return []
        for (const routeUid of loc.routes) {
            const target = getLoc(game, routeUid)
            if (target?.backgrounds.main) uris.push(target.backgrounds.main)
        }
    }

    return [...new Set(uris.filter(Boolean))]
}

function collectFromDirection(game: GameDescription, dir: DialogLinkDirection, currentDialog: string, out: string[]) {
    switch (dir.type) {
        case LinkType.Local: {
            const dialog = game.dialogs.find(d => d.name === currentDialog)
            const target = dialog?.windows.find(w => w.uid === dir.direction)
            if (target?.backgrounds.main) out.push(target.backgrounds.main)
            break
        }
        case LinkType.Push:
        case LinkType.Jump:
        case LinkType.ResetJump: {
            const qd = dir.qualifiedDirection
            if (qd) {
                const dialog = game.dialogs.find(d => d.name === qd.dialog)
                const target = dialog?.windows.find(w => w.uid === qd.window)
                if (target?.backgrounds.main) out.push(target.backgrounds.main)
            }
            break
        }
        case LinkType.NavigateToLocation: {
            const loc = getLoc(game, dir.direction ?? '')
            if (loc?.backgrounds.main) out.push(loc.backgrounds.main)
            break
        }
        case LinkType.TalkToPerson: {
            const char = getChar(game, dir.direction ?? '')
            if (char?.dialog?.background.main) out.push(char.dialog.background.main)
            break
        }
    }
}
