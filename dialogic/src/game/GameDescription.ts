import { createDialogWindowId, DialogWindowId } from "../exec/GameState";
import { createTranslations, Translations } from "../exec/Localization";
import Character, { Role, createCharacterDialog } from "./Character";
import Dialog, { LinkType } from "./Dialog";
import GameEvent, { EventHost } from "./Events";
import Fact from "./Fact";
import GameUiElementDescr, { initGameUiElementMeter, initMeterProgressBar } from "./GameUiElementDescr";
import { emptyImageList } from "./ImageList";
import { Item, createEmptyItem } from "./Items";
import Loc from "./Loc";
import QuestLine from "./Objectives";
import { PointAndClick, PointAndClickZone } from "./PointAndClick";
import Prop, { createNumberProp, createVariantProp } from "./Prop";
import {
    DEFAULT_MENU_FONT_ID,
    DEFAULT_RESPONSES_FONT_ID,
    DEFAULT_TEXT_FONT_ID,
    type FontId,
} from "../lib/fonts";
import { HookScript } from "./HookScript";

export const ENGINE_VERSION = "0.20"

export type DialogTextAlignment = "left" | "right" | "full"
export type ResponseAlignment = "column" | "row" | "flexible"
export type FontSizeId = "xsmall" | "small" | "normal" | "large" | "huge"

export const FONT_SIZE_LABELS: { value: FontSizeId; label: string }[] = [
    { value: 'xsmall', label: 'X-Small' },
    { value: 'small', label: 'Small' },
    { value: 'normal', label: 'Normal' },
    { value: 'large', label: 'Large' },
    { value: 'huge', label: 'Huge' },
]

/** Dialog/narrative text font sizes in px per size tier. */
export const TEXT_FONT_SIZE_PX: Record<FontSizeId, number> = {
    xsmall: 14, small: 17, normal: 22, large: 28, huge: 36,
}

/** Response/answer button font sizes in px per size tier. */
export const RESPONSES_FONT_SIZE_PX: Record<FontSizeId, number> = {
    xsmall: 12, small: 15, normal: 20, large: 24, huge: 30,
}

/** 0–100 opacity for the dialog text panel background (matches legacy #04040446 ≈ 27). */
export const DEFAULT_DIALOG_TEXT_BACKGROUND_OPACITY = 27
/** 0–100 opacity for the notification toast background. */
export const DEFAULT_NOTIFICATION_BACKGROUND_OPACITY = 72
/** Border radius in px for notification toasts (0 = square). */
export const DEFAULT_NOTIFICATION_BORDER_RADIUS = 0
/** 0–100 opacity for the notification toast border (0 = no border). */
export const DEFAULT_NOTIFICATION_BORDER_OPACITY = 0

export interface VisualsConfiguration {
    dialogTextAlignment: DialogTextAlignment
    responseAlignment: ResponseAlignment
    shortHistoryVisible: boolean
    menuFontId: FontId
    textFontId: FontId
    responsesFontId: FontId
    dialogTextBackgroundOpacity: number
    notificationBackgroundOpacity: number
    notificationBorderRadius: number
    notificationBorderOpacity: number
    typewriterEnabled: boolean
    typewriterSpeedMs: number
}

export function createDefaultVisuals(): VisualsConfiguration {
    return {
        dialogTextAlignment: "right",
        responseAlignment: "column",
        shortHistoryVisible: true,
        menuFontId: DEFAULT_MENU_FONT_ID,
        textFontId: DEFAULT_TEXT_FONT_ID,
        responsesFontId: DEFAULT_RESPONSES_FONT_ID,
        dialogTextBackgroundOpacity: DEFAULT_DIALOG_TEXT_BACKGROUND_OPACITY,
        notificationBackgroundOpacity: DEFAULT_NOTIFICATION_BACKGROUND_OPACITY,
        notificationBorderRadius: DEFAULT_NOTIFICATION_BORDER_RADIUS,
        notificationBorderOpacity: DEFAULT_NOTIFICATION_BORDER_OPACITY,
        typewriterEnabled: true,
        typewriterSpeedMs: 30,
    }
}

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

export interface DevConfig {
    basicPromptSuffix: string
}

export function createDefaultDevConfig(): DevConfig {
    return {
        basicPromptSuffix: '',
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
    visuals: VisualsConfiguration
    hooks: HookScript[]
    dev: DevConfig
}

export function createDefaultGame(): GameDescription {
    const merchantRole: Role = {
        name: "merchant",
        description: "Sells goods at the market",
        props: [{ name: "priceModifier", datatype: "number", defaultValue: 1 }],
    };
    const guardRole: Role = {
        name: "guard",
        description: "Keeps watch over the town gate",
        props: [{ name: "alertLevel", datatype: "variant", variants: ["calm", "alert"], defaultValue: "calm" }],
    };

    const mainDialog: Dialog = {
        name: "main",
        windows: [
            {
                uid: "start",
                text: {
                    main: "Welcome to Initial game. This template includes dialogs, facts, NPCs, a quest, inventory, locations, a point-and-click scene, UI meters, and an event — each with at least one example to copy from.",
                    list: [],
                },
                backgrounds: emptyImageList(),
                links: [
                    {
                        mainDirection: { type: LinkType.Local, direction: "chapter_two" },
                        text: "Continue the story",
                        alternativeDirections: [],
                    },
                    {
                        mainDirection: { type: LinkType.NavigateToLocation, direction: "town_square" },
                        text: "Go to Town Square",
                        alternativeDirections: [],
                    },
                    {
                        mainDirection: { type: LinkType.TalkToPerson, direction: "alice" },
                        text: "Talk to Alice (merchant)",
                        alternativeDirections: [],
                    },
                    {
                        mainDirection: { type: LinkType.TalkToPerson, direction: "bob" },
                        text: "Talk to Bob (guard)",
                        alternativeDirections: [],
                    },
                    {
                        mainDirection: { type: LinkType.Local, direction: "pac_scene" },
                        text: "Open point-and-click scene",
                        alternativeDirections: [],
                    },
                ],
                tags: [],
                specialWidget: null,
            },
            {
                uid: "chapter_two",
                text: {
                    main: "The journal tracks the quest \"First steps\", the fact \"Town gate is open\", and the inventory item \"Rusty key\". Open the in-game menu tabs to inspect them.",
                    list: [],
                },
                backgrounds: emptyImageList(),
                links: [
                    {
                        mainDirection: { type: LinkType.Local, direction: "start" },
                        text: "Back to start",
                        alternativeDirections: [],
                    },
                ],
                tags: [],
                specialWidget: null,
            },
            {
                uid: "pac_scene",
                text: {
                    main: "Point-and-click scene. Zones are visible as highlighted areas; add a background image in the PAC editor when you are ready.",
                    list: [],
                },
                backgrounds: emptyImageList(),
                links: [
                    {
                        mainDirection: { type: LinkType.Local, direction: "start" },
                        text: "Leave scene",
                        alternativeDirections: [],
                    },
                ],
                tags: [],
                specialWidget: "pac::example_scene",
            },
            {
                uid: "event_notice",
                text: {
                    main: "A town crier announces that the market is open today. (This window is shown by the example event.)",
                    list: [],
                },
                backgrounds: emptyImageList(),
                links: [
                    {
                        mainDirection: { type: LinkType.Pop, direction: "" },
                        text: "Dismiss",
                        alternativeDirections: [],
                    },
                ],
                tags: [],
                specialWidget: null,
            },
        ],
    };

    const merchantTalkDialog: Dialog = {
        name: "merchant_talk",
        windows: [
            {
                uid: "offer",
                text: {
                    main: "Alice shows you her wares. She has nothing for sale yet — add items and scripts to build this interaction.",
                    list: [],
                },
                backgrounds: emptyImageList(),
                links: [
                    {
                        mainDirection: { type: LinkType.Pop, direction: "" },
                        text: "Back to conversation",
                        alternativeDirections: [],
                    },
                ],
                tags: [],
                specialWidget: null,
                actor: { character: "alice", currentCharacter: false, avatar: undefined },
            },
        ],
    };

    const guardTalkDialog: Dialog = {
        name: "guard_talk",
        windows: [
            {
                uid: "patrol",
                text: {
                    main: "Bob reports that the town gate is open and the market road is clear.",
                    list: [],
                },
                backgrounds: emptyImageList(),
                links: [
                    {
                        mainDirection: { type: LinkType.Pop, direction: "" },
                        text: "Back to conversation",
                        alternativeDirections: [],
                    },
                ],
                tags: [],
                specialWidget: null,
                actor: { character: "bob", currentCharacter: false, avatar: undefined },
            },
        ],
    };

    const aliceDialog = createCharacterDialog();
    aliceDialog.text = { main: "Hello, traveler. Looking to trade?", list: [] };
    aliceDialog.links = [
        {
            mainDirection: {
                type: LinkType.Push,
                direction: "",
                qualifiedDirection: createDialogWindowId("merchant_talk", "offer"),
            },
            text: "What do you sell?",
            alternativeDirections: [],
        },
        {
            mainDirection: { type: LinkType.Pop, direction: "" },
            text: "Goodbye",
            alternativeDirections: [],
        },
        {
            mainDirection: { type: LinkType.Return, direction: "" },
            text: "Return to location",
            alternativeDirections: [],
        },
    ];

    const bobDialog = createCharacterDialog();
    bobDialog.text = { main: "Halt. State your business in town.", list: [] };
    bobDialog.links = [
        {
            mainDirection: {
                type: LinkType.Push,
                direction: "",
                qualifiedDirection: createDialogWindowId("guard_talk", "patrol"),
            },
            text: "How is the gate?",
            alternativeDirections: [],
        },
        {
            mainDirection: { type: LinkType.Pop, direction: "" },
            text: "Goodbye",
            alternativeDirections: [],
        },
        {
            mainDirection: { type: LinkType.Return, direction: "" },
            text: "Return to location",
            alternativeDirections: [],
        },
    ];

    const alice: Character = {
        uid: "alice",
        displayName: { main: "Alice", list: [] },
        traits: [],
        props: [],
        overrideProps: [],
        roles: ["merchant"],
        avatar: emptyImageList(),
        description: { main: "A friendly merchant who runs a stall at the market.", list: [] },
        discussable: true,
        dialog: aliceDialog,
    };

    const bob: Character = {
        uid: "bob",
        displayName: { main: "Bob", list: [] },
        traits: [],
        props: [],
        overrideProps: [],
        roles: ["guard"],
        avatar: emptyImageList(),
        description: { main: "The town guard stationed near the gate.", list: [] },
        discussable: true,
        dialog: bobDialog,
    };

    const townSquare: Loc = {
        uid: "town_square",
        displayName: "Town Square",
        backgrounds: emptyImageList(),
        goto: [],
        text: {
            main: "The central square of a small town. A path leads to the market.",
            list: [],
        },
        links: [
            {
                mainDirection: { type: LinkType.NavigateToLocation, direction: "market" },
                text: "Walk to the market",
                alternativeDirections: [],
            },
        ],
        routes: ["market"],
        discussable: true,
        eventHosts: ["town_square_events"],
    };

    const market: Loc = {
        uid: "market",
        displayName: "Market",
        backgrounds: emptyImageList(),
        goto: [],
        text: {
            main: "Stalls line the market road. Alice's shop is here.",
            list: [],
        },
        links: [
            {
                mainDirection: { type: LinkType.NavigateToLocation, direction: "town_square" },
                text: "Return to the square",
                alternativeDirections: [],
            },
            {
                mainDirection: { type: LinkType.TalkToPerson, direction: "alice" },
                text: "Talk to Alice",
                alternativeDirections: [],
            },
        ],
        routes: ["town_square"],
        discussable: true,
        eventHosts: [],
    };

    const rustyKey: Item = {
        ...createEmptyItem("rusty_key"),
        name: "Rusty key",
        description: "An old iron key. Its lock is unknown.",
        unique: true,
        tags: ["quest_item"],
    };

    const gateIsOpenFact: Fact = {
        uid: "gate_is_open",
        short: "Town gate is open",
        full: "The main gate into town has been left open since morning.",
        discussable: true,
    };

    const examplePacZones: PointAndClickZone[] = [
        {
            id: "door",
            name: "Door",
            x: 10,
            y: 20,
            width: 20,
            height: 60,
            idleOpacity: 0.2,
            hoverOpacity: 0.8,
        },
        {
            id: "chest",
            name: "Chest",
            x: 55,
            y: 50,
            width: 25,
            height: 30,
            idleOpacity: 0.25,
            hoverOpacity: 0.85,
        },
    ];

    const examplePac: PointAndClick = {
        id: "example_scene",
        background: "",
        zones: examplePacZones,
        eventHosts: [],
    };

    const marketEvent: GameEvent = {
        name: "Market announcement",
        highPriority: false,
        probability: 20,
        targets: ["town_square_events"],
        link: createDialogWindowId("main", "event_notice"),
    };

    const game: GameDescription = {
        dialogs: [mainDialog, merchantTalkDialog, guardTalkDialog],
        facts: [gateIsOpenFact],
        chars: [alice, bob],
        locs: [townSquare, market],
        items: [rustyKey],
        events: [marketEvent],
        eventHosts: ["town_square_events"],
        situations: [],
        translations: createTranslations(),
        roles: [merchantRole, guardRole],
        props: [
            createNumberProp("score", 0),
            createVariantProp("difficulty", ["easy", "normal", "hard"], "normal"),
        ],
        buildVersion: 1,
        startupDialog: createDialogWindowId(mainDialog.name, "start"),
        engineVersion: ENGINE_VERSION,
        startMenu: {},
        general: {
            ...createGeneralGameInfo(),
            name: "Initial game",
            version: "0.1.0",
            description: "Game template that shows at least 1 item of any kind to use as template.",
        },
        config: createDefaultConfig(),
        objectives: [{
            uid: "main_questline",
            name: "Main questline",
            tags: ["main"],
            quests: [{
                uid: "first_quest",
                path: ["main_questline", "first_quest"],
                name: "First steps",
                tags: ["tutorial"],
                ordered: true,
                tasks: [
                    {
                        uid: "explore_town",
                        path: ["main_questline", "first_quest", "explore_town"],
                        text: "Visit the town square",
                        critical: true,
                    },
                    {
                        uid: "talk_to_merchant",
                        path: ["main_questline", "first_quest", "talk_to_merchant"],
                        text: "Talk to Alice at the market",
                        critical: true,
                    },
                ],
            }],
        }],
        uiElements: {
            meters: [
                initGameUiElementMeter("Health", "hp"),
                {
                    ...initGameUiElementMeter("Energy", "energy"),
                    progressBar: initMeterProgressBar(),
                },
            ],
        },
        pacWidgets: [examplePac],
        visuals: createDefaultVisuals(),
        hooks: [],
        dev: createDefaultDevConfig(),
    };

    return game;
}
