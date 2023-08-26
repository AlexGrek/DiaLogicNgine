import { createDialogWindowId, UiObjectId } from "../exec/GameState";
import Character from "./Character";
import Dialog from "./Dialog";
import Fact from "./Fact";
import Loc from "./Loc";

export interface GameDescription {
    dialogs: Dialog[]
    facts: Fact[]
    chars: Character[]
    locs: Loc[]
    version: number
    startupDialog: UiObjectId
}

export function createDefaultGame(): GameDescription {
    let d1 = { name: "dialog1", windows: [
        { "uid": "welcome", "text": "Welcome to the new game!", "links": [ ] },
    ] };
    let game = { 
        dialogs: [d1],
        facts: [],
        chars: [],
        locs: [],
        version: 1,
        startupDialog: createDialogWindowId(d1.name, d1.windows[0].uid)
    };

    return game
}
