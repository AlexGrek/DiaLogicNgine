import Character, { getChar } from "../game/Character"
import Dialog, { DialogLink, DialogWindow, LinkType } from "../game/Dialog"
import { GameDescription } from "../game/GameDescription"
import Loc from "../game/Loc"
import { State, UiObjectId, isDialogVisited, isLocationVisited } from "./GameState"


export function tryGetDialogWindowById(game: GameDescription, uid: UiObjectId):Readonly<[Dialog, DialogWindow]> | null {
    if (uid.kind === "window") {
        const expectedDialog = uid.dialog
        const expectedWindow = uid.window
        const dialog = game.dialogs.find(d => d.name === expectedDialog)
        if (dialog === undefined)
            return null
        const window = dialog?.windows.find(w => w.uid === expectedWindow)
        if (window === undefined)
            return null
        return [dialog, window]
    }
    return null
}

export function tryGetLocationById(game: GameDescription, uid: UiObjectId): Readonly<Loc> | null {
    if (uid.kind === "location") {
        const expectedWindow = uid.location
        const found = game.locs.find(loc => loc.uid === expectedWindow)
        if (!found) {
            console.error(`Location ${expectedWindow} was not found in ${JSON.stringify(game.locs)}`)
            return null
        }
        return found
    }
    return null;
}

export function tryGetCharById(game: GameDescription, uid: UiObjectId): Character | null {
    if (uid.kind === "chardialog") {
        const charUid = uid.char
        const found = getChar(game, charUid)
        if (!found) {
            console.error(`Character ${charUid} was not found in ${JSON.stringify(game.locs)}`)
            return null
        }
        return found || null
    }
    return null
}

/**
 * Does this link point at something the player has already seen — a dialog window
 * they have been in, a character they have talked to, a location they have stood in?
 *
 * Only the main direction is inspected: resolving an alternative direction means
 * running `useAlternativeWhen`, which may mutate state, and this is asked once per
 * link on every render.
 *
 * `Pop` / `Return` / `QuickReply` have no target to speak of and are never "visited".
 */
export function linkTargetVisited(state: State, link: DialogLink): boolean {
    const direction = link.mainDirection
    switch (direction.type) {
        case LinkType.Local: {
            // a local link stays in the dialog we are currently in
            if (state.position.kind !== "window" || !direction.direction) {
                return false
            }
            return isDialogVisited(state, state.position.dialog, direction.direction)
        }
        case LinkType.Push:
        case LinkType.Jump:
        case LinkType.ResetJump: {
            const target = direction.qualifiedDirection
            return target ? isDialogVisited(state, target.dialog, target.window) : false
        }
        case LinkType.NavigateToLocation:
            return direction.direction ? isLocationVisited(state, direction.direction) : false
        case LinkType.TalkToPerson:
            // knownPeople is filled on entering a character dialog, never before
            return direction.direction ? state.knownPeople.includes(direction.direction) : false
        default:
            return false
    }
}
