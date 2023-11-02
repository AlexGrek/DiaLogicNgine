import { createDialogWindowId, DialogWindowId } from "../exec/GameState";
import Character, { Role } from "./Character";
import Dialog from "./Dialog";
import GameEvent, { EventHost } from "./Events";
import Fact from "./Fact";
import { emptyImageList } from "./ImageList";
import { Item } from "./Items";
import Loc from "./Loc";
import QuestLine from "./Objectives";
import Prop, { createNumberProp, createVariantProp } from "./Prop";

export const ENGINE_VERSION="0.6"

export interface StartMenuConfiguration {
    menuBackground?: string
}

export interface Config {
    assetsPath: string
}

export function createDefaultConfig() {
    return {
        assetsPath: ''
    }

}

export interface GeneralGameInfo {
    name: string
    version: string
    authors: string[]
    extras: { [key: string]: string | number}
    description: string
}

export function createGeneralGameInfo(): GeneralGameInfo {
    return {
        name: '', version: '', authors: ['alexgrek'], extras: {}, description: ''
    }
}

export interface GameDescription {
    dialogs: Dialog[]
    facts: Fact[]
    chars: Character[]
    roles: Role[]
    locs: Loc[]
    props: Prop[]
    items: Item[]
    eventHosts: EventHost[],
    events: GameEvent[],
    buildVersion: number
    startupDialog: DialogWindowId
    engineVersion: string
    startMenu: StartMenuConfiguration
    general: GeneralGameInfo
    config: Config
    objectives: QuestLine[]
}

export function createDefaultGame(): GameDescription {
    let d1 = {
        name: "dialog1", windows: [
            {
                "uid": "welcome", "text": { "main": "Welcome to the game!", "list": [] },
                "backgrounds": { "list": [] }, "links": [], tags: []
            },
        ]
    };
    const agedRole: Role = { name: "aged", props: [{ name: "age", datatype: "number", defaultValue: 30 }] }
    const narratorCharacter: Character = {
        uid: "narrator",
        displayName: { "main": "Narrator", "list": [] },
        traits: [],
        props: [{ "datatype": "variant", "name": "mood", "variants": ["bored", "happy"], "defaultValue": "bored" }],
        overrideProps: [{ "name": "age", "datatype": "number", "defaultValue": 27 }],
        roles: ["aged"],
        avatar: emptyImageList(),
        description: { main: "", list: [] }
    }
    let game: GameDescription = {
        dialogs: [d1],
        facts: [],
        chars: [narratorCharacter],
        locs: [],
        items: [],
        events: [],
        eventHosts: [],
        roles: [agedRole],
        props: [
            createNumberProp("testNumProp", 42),
            createVariantProp("testVariantProp", ["a", "b", "c"], "b")
        ],
        buildVersion: 1,
        startupDialog: createDialogWindowId(d1.name, d1.windows[0].uid),
        engineVersion: ENGINE_VERSION,
        startMenu: {},
        general: createGeneralGameInfo(),
        config: createDefaultConfig(),
        objectives: [{
            uid: 'misc',
            name: "Miscellanous",
            tags: ['main', 'misc'],
            quests: []
        }]
    };

    return game
}
