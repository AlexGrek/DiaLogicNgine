import { createDialogWindowId, DialogWindowId } from "../exec/GameState";
import Character, { Role } from "./Character";
import Dialog from "./Dialog";
import Fact from "./Fact";
import { emptyImageList } from "./ImageList";
import { Item } from "./Items";
import Loc from "./Loc";
import Prop, { createNumberProp, createVariantProp } from "./Prop";

export interface StartMenuConfiguration {
    menuBackground?: string
}

export interface GameDescription {
    dialogs: Dialog[]
    facts: Fact[]
    chars: Character[]
    roles: Role[]
    locs: Loc[]
    props: Prop[]
    items: Item[]
    buildVersion: number
    startupDialog: DialogWindowId
    engineVersion: string
    startMenu: StartMenuConfiguration
}

export function createDefaultGame(): GameDescription {
    let d1 = { name: "dialog1", windows: [
        { "uid": "welcome", "text": {"main": "Welcome to the game!", "list": []},
        "backgrounds": {"list": []}, "links": [ ], tags: [] },
    ] };
    const agedRole: Role = { name: "aged", props: [ { name: "age", datatype: "number", defaultValue: 30 } ] }
    const narratorCharacter: Character =  {
        uid: "narrator",
        displayName: { "main": "Narrator", "list": [] },
        traits: [],
        props: [ { "datatype": "variant", "name": "mood", "variants": [ "bored", "happy" ], "defaultValue": "bored" } ],
        overrideProps: [ { "name": "age", "datatype": "number", "defaultValue": 27 } ],
        roles: [ "aged" ],
        avatar: emptyImageList(),
        description: { main: "", list: []}
      }
    let game: GameDescription = { 
        dialogs: [d1],
        facts: [],
        chars: [ narratorCharacter ],
        locs: [],
        items: [],
        roles: [ agedRole ],
        props: [
            createNumberProp("testNumProp", 42),
            createVariantProp("testVariantProp", ["a", "b", "c"], "b")
        ],
        buildVersion: 1,
        startupDialog: createDialogWindowId(d1.name, d1.windows[0].uid),
        engineVersion: "0.4",
        startMenu: {}
    };

    return game
}
