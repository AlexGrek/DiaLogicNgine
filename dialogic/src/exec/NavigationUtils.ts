import Dialog, { DialogWindow } from "../game/Dialog"
import { GameDescription } from "../game/GameDescription"
import Loc from "../game/Loc"
import { UiObjectId } from "./GameState"


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