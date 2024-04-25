import { GameDescription } from "../game/GameDescription";
import { DialogWindowId, LocationID, State, UiObjectId } from "./GameState";

export function getListForPrealoading(game: GameDescription, state: State) {
    const current = state.position

}

function getAllPossibleTargets(game: GameDescription, current: UiObjectId) {
    switch (current.kind) {
        case "location":
            return getLocatiopnTargets(game, current)
            break;
        case "window":
            return getWindowTargets(game, current)
    }
}

function getWindowTargets(game: GameDescription, current: DialogWindowId) {
    const dialog = game.dialogs
}
function getLocatiopnTargets(game: GameDescription, current: LocationID) {
    throw new Error("Function not implemented.");
}

