import { createDialogWindowId, DialogWindowId } from "../exec/GameState";
import { createTranslations, Translations } from "../exec/Localization";
import Character, { Role } from "./Character";
import Dialog from "./Dialog";
import GameEvent, { EventHost } from "./Events";
import Fact from "./Fact";
import GameUiElementDescr, { initGameUiElementDescr } from "./GameUiElementDescr";
import { emptyImageList } from "./ImageList";
import { Item } from "./Items";
import Loc from "./Loc";
import QuestLine from "./Objectives";
import { PointAndClick, PointAndClickZone } from "./PointAndClick";
import Prop, { createNumberProp, createVariantProp } from "./Prop";

export const ENGINE_VERSION = "0.10"

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
    extras: { [key: string]: string | number }
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
    situations: string[]
    translations: Translations
    uiElements: GameUiElementDescr
    pacWidgets: PointAndClick[]
}

export function createDefaultGame(): GameDescription {
    const d1: Dialog = {
        name: "dialog1", windows: [
            {
                "uid": "welcome", "text": { "main": "Welcome to the game!", "list": [] },
                "backgrounds": { "list": [] }, "links": [], tags: [], specialWidget: null
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
        description: { main: "", list: [] },
        discussable: true
    }

    const demoPointAndClickZones: PointAndClickZone[] = [
        {
            id: 'door',
            name: 'Old Door',
            x: 15,
            y: 25,
            width: 20,
            height: 50,
            idleOpacity: 0.2,
            hoverOpacity: 0.8,
        },
        {
            id: 'window',
            name: 'Window',
            x: 50,
            y: 20,
            width: 15,
            height: 25,
            idleOpacity: 0.3,
            hoverOpacity: 0.9,
        },
        {
            id: 'table',
            name: 'Wooden Table',
            x: 65,
            y: 60,
            width: 25,
            height: 30,
            idleOpacity: 0.25,
            hoverOpacity: 0.85,
        },
    ];

    const demoPac: PointAndClick = {
        id: "demoPointAndClick",
        zones: demoPointAndClickZones,
        eventHosts: []
    }

    const game: GameDescription = {
        dialogs: [d1],
        facts: [],
        chars: [narratorCharacter],
        locs: [],
        items: [],
        events: [],
        eventHosts: [],
        situations: [],
        translations: createTranslations(),
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
        }],
        uiElements: initGameUiElementDescr(),
        pacWidgets: [
            demoPac
        ]
    };

    return game
}
