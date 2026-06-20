import { createDialogWindowId } from "../exec/GameState";
import { createTranslations } from "../exec/Localization";
import Character, { Role, createCharacterDialog } from "./Character";
import Dialog, { LinkType } from "./Dialog";
import GameEvent from "./Events";
import Fact from "./Fact";
import { initGameUiElementMeter, initMeterProgressBar } from "./GameUiElementDescr";
import { emptyImageList } from "./ImageList";
import { Item, createEmptyItem } from "./Items";
import Loc from "./Loc";
import QuestLine from "./Objectives";
import { PointAndClick, PointAndClickZone } from "./PointAndClick";
import { createBoolProp, createNumberProp, createStringProp, createVariantProp } from "./Prop";
import { HookScript, makeFactDiscoveredHook, makeItemAcquiredHook } from "./HookScript";
import { ScriptFunction } from "./ScriptFunction";
import {
    ENGINE_VERSION,
    GameDescription,
    createDefaultConfig,
    createDefaultDevConfig,
    createDefaultGame,
    createDefaultVisuals,
    createGeneralGameInfo,
} from "./GameDescription";

/**
 * "The Scripting Lab" — a second starter template focused on the engine's
 * *coding* features. Every interaction is wired up with a script so it doubles
 * as a copyable reference:
 *
 *  - window `entryScript` (runs on enter)            — `lab/entrance`
 *  - link `actionCode` (runs when followed)          — "Earn 10 gold"
 *  - link `isEnabled` (conditional, greys out)       — "Spend 5 gold"
 *  - link `isVisible` (conditional, hides)           — "Pick up the vault key"
 *  - link alternative direction + `useAlternativeWhen`— "Enter the vault"
 *  - window `chooseTextScript` (dynamic text variant)— `lab/entrance`
 *  - reusable `functions` called from scripts        — `earnGold`, `powered`
 *  - lifecycle `hooks` (fact discovered / item got)  — battery counter, fact reward
 *  - quest / task scripting (open + complete)        — "Lab objectives"
 *  - PAC zone `isVisibleIfScript` / `isDisabledIfScript`
 *  - a scripted event firing on a location
 */
export function createScriptingShowcaseGame(): GameDescription {
    const technicianRole: Role = {
        name: "technician",
        description: "Keeps the lab's machinery running.",
        props: [{ name: "clearance", datatype: "number", defaultValue: 1 }],
    };

    // ── Reusable functions injected into every script's scope ────────────────
    const functions: ScriptFunction[] = [
        {
            name: "earnGold",
            args: "amount",
            description: "Adds `amount` to the 'gold' prop and returns the new total.",
            body: "rt.props.gold += amount\nreturn rt.props.gold",
        },
        {
            name: "powered",
            args: "",
            description: "Returns true when the lab's main power is switched on.",
            body: "return rt.props.power === 'on'",
        },
    ];

    // ── Main dialog ──────────────────────────────────────────────────────────
    const labDialog: Dialog = {
        name: "lab",
        windows: [
            {
                uid: "entrance",
                // Runs every time the window is entered: bumps a visit counter and
                // opens the quest line on the very first visit.
                entryScript:
                    "rt.props.visits += 1\n" +
                    "if (rt.props.visits === 1) {\n" +
                    "    rt.objectives.lab_objectives.power_up.open()\n" +
                    "}",
                // Returns a text-variant name when revisiting, otherwise the main text.
                chooseTextScript: "return rt.props.visits > 1 ? 'returning' : null",
                text: {
                    main:
                        "Welcome to the Scripting Lab. Nothing here is hand-written — every button " +
                        "runs a script. Open the in-game State panel to watch props, items, facts and " +
                        "quests change as you click.",
                    list: [
                        {
                            name: "returning",
                            text:
                                "Back in the Scripting Lab. Each choice still runs its own script — " +
                                "experiment and copy whatever you need into your own game.",
                        },
                    ],
                },
                backgrounds: emptyImageList(),
                tags: [],
                specialWidget: null,
                links: [
                    {
                        // actionCode + calling a reusable function
                        mainDirection: { type: LinkType.Local, direction: "entrance" },
                        text: "Earn 10 gold (actionCode)",
                        actionCode: "earnGold(10)",
                        alternativeDirections: [],
                    },
                    {
                        // isEnabled — greyed out until you can afford it
                        mainDirection: { type: LinkType.Local, direction: "entrance" },
                        text: "Spend 5 gold (isEnabled)",
                        isEnabled: "return rt.props.gold >= 5",
                        actionCode: "rt.props.gold -= 5",
                        alternativeDirections: [],
                    },
                    {
                        // isVisible — disappears once you own the key
                        mainDirection: { type: LinkType.Local, direction: "entrance" },
                        text: "Pick up the vault key (isVisible)",
                        isVisible: "return !rt.items.has('vault_key')",
                        actionCode: "rt.items.add('vault_key')",
                        alternativeDirections: [],
                    },
                    {
                        // items.add — feeds the battery-counter hook + quest task
                        mainDirection: { type: LinkType.Local, direction: "entrance" },
                        text: "Collect a battery (items.add)",
                        actionCode: "rt.items.add('battery')",
                        alternativeDirections: [],
                    },
                    {
                        // variant prop toggle + completing a quest task
                        mainDirection: { type: LinkType.Local, direction: "entrance" },
                        text: "Toggle main power (variant prop)",
                        actionCode:
                            "rt.props.power = powered() ? 'off' : 'on'\n" +
                            "if (powered()) {\n" +
                            "    rt.objectives.lab_objectives.power_up.turn_on_power.complete()\n" +
                            "}",
                        alternativeDirections: [],
                    },
                    {
                        // facts.know() — fires the FACTS::DISCOVERED hook below
                        mainDirection: { type: LinkType.Local, direction: "entrance" },
                        text: "Learn how scripts work (facts)",
                        isVisible: "return !rt.facts.scripts_change_state.known",
                        actionCode: "rt.facts.scripts_change_state.know()",
                        alternativeDirections: [],
                    },
                    {
                        // alternative direction: routes to vault_open only when the
                        // condition holds, otherwise to vault_locked.
                        mainDirection: { type: LinkType.Local, direction: "vault_locked" },
                        text: "Enter the vault (alternative direction)",
                        isAlternativeLink: true,
                        useAlternativeWhen: "return powered() && rt.items.has('vault_key')",
                        alternativeDirections: [{ type: LinkType.Local, direction: "vault_open" }],
                    },
                    {
                        mainDirection: { type: LinkType.NavigateToLocation, direction: "control_room" },
                        text: "Visit the Control Room",
                        alternativeDirections: [],
                    },
                    {
                        mainDirection: { type: LinkType.TalkToPerson, direction: "ada" },
                        text: "Talk to Ada (technician)",
                        alternativeDirections: [],
                    },
                    {
                        mainDirection: { type: LinkType.Local, direction: "console_scene" },
                        text: "Open the point-and-click console",
                        alternativeDirections: [],
                    },
                ],
            },
            {
                uid: "vault_locked",
                text: {
                    main:
                        "The vault is sealed. The panel reads: \"Main power must be ON and a valid vault " +
                        "key inserted.\" Toggle the power and pick up the key, then try again.",
                    list: [],
                },
                backgrounds: emptyImageList(),
                tags: [],
                specialWidget: null,
                links: [
                    {
                        mainDirection: { type: LinkType.Local, direction: "entrance" },
                        text: "Step back",
                        alternativeDirections: [],
                    },
                ],
            },
            {
                uid: "vault_open",
                // entryScript can reward the player and flip a boolean flag
                entryScript:
                    "if (!rt.props.vaultOpened) {\n" +
                    "    rt.props.vaultOpened = true\n" +
                    "    earnGold(100)\n" +
                    "}",
                text: {
                    main:
                        "The vault swings open. The reward of 100 gold has been added to your purse by " +
                        "this window's entry script — but only the first time it opens.",
                    list: [],
                },
                backgrounds: emptyImageList(),
                tags: [],
                specialWidget: null,
                links: [
                    {
                        mainDirection: { type: LinkType.Local, direction: "entrance" },
                        text: "Leave the vault",
                        alternativeDirections: [],
                    },
                ],
            },
            {
                uid: "console_scene",
                text: {
                    main:
                        "Point-and-click console. The two switches use isVisibleIfScript and " +
                        "isDisabledIfScript — the second only appears once power is on.",
                    list: [],
                },
                backgrounds: emptyImageList(),
                tags: [],
                specialWidget: "pac::lab_console",
                links: [
                    {
                        mainDirection: { type: LinkType.Local, direction: "entrance" },
                        text: "Leave the console",
                        alternativeDirections: [],
                    },
                ],
            },
            {
                uid: "surge_notice",
                text: {
                    main: "ALERT: the reactor logged a power surge. (This window is shown by the example event.)",
                    list: [],
                },
                backgrounds: emptyImageList(),
                tags: [],
                specialWidget: null,
                links: [
                    {
                        mainDirection: { type: LinkType.Pop, direction: "" },
                        text: "Dismiss",
                        alternativeDirections: [],
                    },
                ],
            },
        ],
    };

    // ── Sub-dialog opened via Push from Ada's discussion ─────────────────────
    const adaTalkDialog: Dialog = {
        name: "ada_talk",
        windows: [
            {
                uid: "clearance",
                text: {
                    main:
                        "\"Your clearance comes from the technician role's 'clearance' prop. Roles let you " +
                        "attach props and behaviour to whole groups of characters.\"",
                    list: [],
                },
                backgrounds: emptyImageList(),
                tags: [],
                specialWidget: null,
                actor: { character: "ada", currentCharacter: false, avatar: undefined },
                links: [
                    {
                        mainDirection: { type: LinkType.Pop, direction: "" },
                        text: "Back",
                        alternativeDirections: [],
                    },
                ],
            },
        ],
    };

    // ── Ada — a discussable character with a scripted conversation ───────────
    const adaDialog = createCharacterDialog();
    adaDialog.text = { main: "I'm Ada, the lab technician. Power's been flaky — what do you need?", list: [] };
    adaDialog.links = [
        {
            mainDirection: {
                type: LinkType.Push,
                direction: "",
                qualifiedDirection: createDialogWindowId("ada_talk", "clearance"),
            },
            text: "What's my clearance?",
            alternativeDirections: [],
        },
        {
            // isVisible: only offered while the power is on
            mainDirection: { type: LinkType.Pop, direction: "" },
            text: "Ask for a spare battery",
            isVisible: "return powered()",
            actionCode: "rt.items.add('battery')",
            alternativeDirections: [],
        },
        {
            mainDirection: { type: LinkType.Return, direction: "" },
            text: "Head back into the lab",
            alternativeDirections: [],
        },
        {
            mainDirection: { type: LinkType.Pop, direction: "" },
            text: "Goodbye",
            alternativeDirections: [],
        },
    ];

    const ada: Character = {
        uid: "ada",
        displayName: { main: "Ada", list: [] },
        traits: [],
        props: [],
        overrideProps: [],
        roles: ["technician"],
        avatar: emptyImageList(),
        description: { main: "The lab technician. She keeps the reactor and the vault running.", list: [] },
        discussable: true,
        dialog: adaDialog,
    };

    // ── Locations ────────────────────────────────────────────────────────────
    const controlRoom: Loc = {
        uid: "control_room",
        displayName: "Control Room",
        backgrounds: emptyImageList(),
        goto: [],
        text: {
            main: "Monitors line the control room. A corridor leads to storage; a ladder returns to the lab.",
            list: [],
        },
        links: [
            {
                mainDirection: { type: LinkType.NavigateToLocation, direction: "storage" },
                text: "Walk to storage",
                alternativeDirections: [],
            },
            {
                mainDirection: { type: LinkType.TalkToPerson, direction: "ada" },
                text: "Talk to Ada",
                alternativeDirections: [],
            },
            {
                // resetjump back into the dialog graph from a location
                mainDirection: {
                    type: LinkType.ResetJump,
                    direction: "",
                    qualifiedDirection: createDialogWindowId("lab", "entrance"),
                },
                text: "Return to the lab",
                alternativeDirections: [],
            },
        ],
        routes: ["storage"],
        discussable: true,
        eventHosts: ["lab_events"],
    };

    const storage: Loc = {
        uid: "storage",
        displayName: "Storage",
        backgrounds: emptyImageList(),
        goto: [],
        text: {
            main: "Shelves of spare parts. There are loose batteries here for the taking.",
            list: [],
        },
        links: [
            {
                mainDirection: { type: LinkType.NavigateToLocation, direction: "control_room" },
                text: "Back to the control room",
                alternativeDirections: [],
            },
            {
                // actionCode on a location link
                mainDirection: { type: LinkType.NavigateToLocation, direction: "storage" },
                text: "Grab a battery off the shelf",
                actionCode: "rt.items.add('battery')",
                alternativeDirections: [],
            },
        ],
        routes: ["control_room"],
        discussable: true,
        eventHosts: [],
    };

    // ── Items ────────────────────────────────────────────────────────────────
    const vaultKey: Item = {
        ...createEmptyItem("vault_key"),
        name: "Vault key",
        description: "A magnetic key card that, together with main power, opens the vault.",
        unique: true,
        tags: ["tool"],
    };
    const battery: Item = {
        ...createEmptyItem("battery"),
        name: "Battery",
        description: "A rechargeable cell. Collect three to finish the stockpile task.",
        stackable: true,
        tags: ["resource"],
    };

    // ── Facts ────────────────────────────────────────────────────────────────
    const scriptsChangeStateFact: Fact = {
        uid: "scripts_change_state",
        short: "Scripts can change game state",
        full: "Every link, window and hook can run a script that mutates props, items, facts and quests.",
        discussable: true,
    };

    // ── Hooks (lifecycle scripts) ────────────────────────────────────────────
    const hooks: HookScript[] = [
        {
            name: "Reward for learning",
            hook: makeFactDiscoveredHook("scripts_change_state"),
            body: "earnGold(25)",
        },
        {
            name: "Battery stockpile counter",
            hook: makeItemAcquiredHook("battery"),
            body:
                "if (rt.items.count('battery') >= 3) {\n" +
                "    rt.objectives.lab_objectives.power_up.gather_batteries.complete()\n" +
                "}",
        },
    ];

    // ── Quest line ───────────────────────────────────────────────────────────
    const labObjectives: QuestLine = {
        uid: "lab_objectives",
        name: "Lab objectives",
        tags: ["main"],
        quests: [
            {
                uid: "power_up",
                path: ["lab_objectives", "power_up"],
                name: "Power up the lab",
                tags: ["tutorial"],
                ordered: true,
                tasks: [
                    {
                        uid: "turn_on_power",
                        path: ["lab_objectives", "power_up", "turn_on_power"],
                        text: "Switch the main power on",
                        critical: true,
                    },
                    {
                        uid: "gather_batteries",
                        path: ["lab_objectives", "power_up", "gather_batteries"],
                        text: "Stockpile 3 batteries",
                        critical: true,
                    },
                ],
            },
        ],
    };

    // ── Point-and-click scene ────────────────────────────────────────────────
    const consoleZones: PointAndClickZone[] = [
        {
            id: "main_switch",
            name: "Main switch",
            x: 12,
            y: 30,
            width: 25,
            height: 45,
            idleOpacity: 0.25,
            hoverOpacity: 0.85,
            // disabled until power is on — demonstrates a rendered zone script
            isDisabledIfScript: "return !powered()",
        },
        {
            id: "vault_switch",
            name: "Vault switch",
            x: 60,
            y: 30,
            width: 25,
            height: 45,
            idleOpacity: 0.25,
            hoverOpacity: 0.85,
            // only visible once you carry the vault key
            isVisibleIfScript: "return rt.items.has('vault_key')",
        },
    ];

    const consolePac: PointAndClick = {
        id: "lab_console",
        background: "",
        zones: consoleZones,
        eventHosts: [],
    };

    // ── Event firing on the control room ─────────────────────────────────────
    const surgeEvent: GameEvent = {
        name: "Reactor surge",
        highPriority: false,
        probability: 25,
        targets: ["lab_events"],
        link: createDialogWindowId("lab", "surge_notice"),
    };

    const game: GameDescription = {
        dialogs: [labDialog, adaTalkDialog],
        facts: [scriptsChangeStateFact],
        chars: [ada],
        locs: [controlRoom, storage],
        items: [vaultKey, battery],
        events: [surgeEvent],
        eventHosts: ["lab_events"],
        situations: [],
        translations: createTranslations(),
        roles: [technicianRole],
        props: [
            createNumberProp("gold", 0),
            createNumberProp("visits", 0),
            createStringProp("operatorName", "Operator"),
            createVariantProp("power", ["off", "on"], "off"),
            createBoolProp("vaultOpened", false),
        ],
        buildVersion: 1,
        startupDialog: createDialogWindowId(labDialog.name, "entrance"),
        engineVersion: ENGINE_VERSION,
        startMenu: {},
        general: {
            ...createGeneralGameInfo(),
            name: "The Scripting Lab",
            version: "0.1.0",
            description:
                "A scripting-focused template: every link, window and hook runs a script you can copy.",
        },
        config: createDefaultConfig(),
        objectives: [labObjectives],
        uiElements: {
            meters: [
                // A plain meter whose value is computed by a script.
                { ...initGameUiElementMeter("Gold", "gold"), value: "return rt.props.gold" },
                // A progress-bar meter driven by a script that counts items.
                {
                    ...initGameUiElementMeter("Batteries", "batteries"),
                    value: "return rt.items.count('battery')",
                    progressBar: { ...initMeterProgressBar(), max: 3 },
                },
            ],
        },
        pacWidgets: [consolePac],
        visuals: createDefaultVisuals(),
        hooks,
        functions,
        dev: createDefaultDevConfig(),
    };

    return game;
}

/** A selectable starting point for a new project. */
export interface GameTemplate {
    id: string;
    name: string;
    description: string;
    create: () => GameDescription;
}

/**
 * Registry of templates offered on the home page's "New project" panel.
 * The first entry is the default selection.
 */
export const GAME_TEMPLATES: GameTemplate[] = [
    {
        id: "starter",
        name: "Starter",
        description:
            "A small town with dialogs, NPCs, a quest, inventory, locations, a point-and-click scene and an event — one of each to copy from.",
        create: createDefaultGame,
    },
    {
        id: "scripting",
        name: "Scripting Lab",
        description:
            "Coding-focused demo: entry scripts, conditional links, reusable functions, lifecycle hooks and quest scripting — every button runs a script.",
        create: createScriptingShowcaseGame,
    },
];

export const DEFAULT_TEMPLATE_ID = GAME_TEMPLATES[0].id;
