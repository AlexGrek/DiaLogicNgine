import { createDialogWindowId, DialogWindowId } from "../exec/GameState";
import Character from "./Character";
import Dialog from "./Dialog";
import Fact from "./Fact";
import Loc from "./Loc";
import Prop, { createNumberProp, createVariantProp } from "./Prop";

export interface GameDescription {
    dialogs: Dialog[]
    facts: Fact[]
    chars: Character[]
    locs: Loc[]
    props: Prop[]
    buildVersion: number
    startupDialog: DialogWindowId
    engineVersion: string
}

export function createDefaultGame(): GameDescription {
    let d1 = { name: "dialog1", windows: [
        { "uid": "welcome", "text": {"main": "Welcome to the game!", "list": []}, "links": [ ] },
    ] };
    let game = { 
        dialogs: [d1],
        facts: [],
        chars: [],
        locs: [],
        props: [
            createNumberProp("testNumProp", 42),
            createVariantProp("testVariantProp", ["a", "b", "c"], "b")
        ],
        buildVersion: 1,
        startupDialog: createDialogWindowId(d1.name, d1.windows[0].uid),
        engineVersion: "0.3"
    };

    return game
}
