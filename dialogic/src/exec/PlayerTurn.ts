/**
 * Player-agnostic turn logic, shared by every player front end:
 * the web player (components/player), the MCP runner (player-runner) and the
 * `dialogic` CLI debug player. Pure: no React, no DOM.
 *
 * A front end renders `exec.renderer.render(state)`, asks `availableActions`
 * what the player may do, and turns a choice into the next state with
 * `applyAction`. Only presentation (animation, typewriter, layout) and
 * transport (JSON for the MCP, text for the CLI) live outside this module.
 */
import { createEmptyFact, getFact } from "../game/Fact"
import { Item, getItemByIdOrUnknown } from "../game/Items"
import { getLoc } from "../game/Loc"
import { DiscussionTopicType, GameExecManager } from "./GameExecutor"
import { HistoryRecord, InGameNotification, State, UiObjectId, getVisitedLocations } from "./GameState"
import {
    CharDialogRenderView,
    DialogRenderView,
    LocRouteRenderView,
    PointAndClickZoneRenderView,
    RenderLink,
    RenderWidget,
} from "./RenderView"

// ── Actions ────────────────────────────────────────────────────────────────

export type PlayerAction =
    /** Next text page, or the window's single auto-continue link. */
    | { type: "continue" }
    /** A dialog, character or location link by its render index. */
    | { type: "link"; index: number }
    /** A location route, by destination uid or render index. */
    | { type: "route"; uid?: string; index?: number }
    /** A point-and-click zone, by zone id or position. */
    | { type: "zone"; id?: string; index?: number }
    /** A discussion topic with the current character. */
    | { type: "discuss"; topicType: DiscussionTopicType; id: string }
    /** Use a carried item in the current dialog window. */
    | { type: "useItem"; uid: string }

/** A move that is not possible on the current screen. The message is player/agent facing. */
export class PlayerActionError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "PlayerActionError"
    }
}

export type ContinueMode = "next_page" | "continue_link" | null

export interface TopicItem {
    uid: string
    name: string
}

export interface DiscussTopics {
    people: TopicItem[]
    facts: TopicItem[]
    items: TopicItem[]
    places: TopicItem[]
}

export interface UsableItem {
    uid: string
    name: string
    quantity: number
}

export interface AvailableActions {
    widget: RenderWidget["widget"]
    /** What `continue` does now; null when the player has to choose instead. */
    continueMode: ContinueMode
    /** The continue link is shown but disabled. */
    continueDisabled: boolean
    links: RenderLink[]
    routes: LocRouteRenderView[]
    zones: PointAndClickZoneRenderView[]
    /** Only on a character screen once its text is read; null elsewhere. */
    discussTopics: DiscussTopics | null
    usableItems: UsableItem[]
}

// ── Game start ─────────────────────────────────────────────────────────────

/** A new game: initial state with the startup position's entry script applied. */
export function newGame(exec: GameExecManager): State {
    return exec.newGameState()
}

/** Notifications added between two states (the engine only ever appends). */
export function newNotifications(prev: State, next: State): InGameNotification[] {
    const before = prev.notifications?.length ?? 0
    return next.notifications && next.notifications.length > before ? next.notifications.slice(before) : []
}

/** Render the current screen (no background-change bookkeeping). */
export function currentView(exec: GameExecManager, state: State): RenderWidget {
    return exec.renderer.render(state, null).uiWidgetView
}

// ── What can the player do ─────────────────────────────────────────────────

type PagedView = DialogRenderView | CharDialogRenderView

function continueModeOf(view: PagedView): ContinueMode {
    if (view.pageIndex < view.pageCount - 1) return "next_page"
    if (view.continueLink != null) return "continue_link"
    return null
}

/** People, facts, items and places the current character can be asked about. */
export function discussTopics(exec: GameExecManager, state: State, view: CharDialogRenderView): DiscussTopics {
    const game = exec.game
    const opts = view.dialogOptions
    const people = opts.canDiscussChars
        ? state.knownPeople
            .map((uid) => ({ uid, descr: exec.renderer.getCharInfoDescription(state, uid) }))
            .filter((x) => x.descr.charObject.discussable)
            .map(({ uid, descr }) => ({ uid, name: descr.name }))
        : []
    const facts = opts.canDiscussFacts
        ? state.knownFacts
            .map((uid) => getFact(game, uid) ?? { ...createEmptyFact(uid), short: `Error fact ${uid}` })
            .filter((fact) => fact.discussable)
            .map((fact) => ({ uid: fact.uid, name: fact.short || fact.uid }))
        : []
    const items = opts.canDiscussItems
        ? state.carriedItems.map((carried) => ({ uid: carried.item, name: getItemByIdOrUnknown(game.items, carried.item).name }))
        : []
    const places = opts.canDiscussLocations
        ? state.knownPlaces
            .map((uid) => ({ uid, loc: getLoc(game, uid) }))
            .filter(({ loc }) => !loc || loc.discussable)
            .map(({ uid, loc }) => ({ uid, name: loc ? (loc.displayName || uid) : `No location found <${uid}>` }))
        : []
    return { people, facts, items, places }
}

/** Items can be used only on a plain dialog window (they re-run its entry script). */
export function canUseItems(state: State, view: RenderWidget): boolean {
    return view.widget === "dialog" && state.position.kind === "window"
}

export function usableItems(exec: GameExecManager, state: State, view: RenderWidget): UsableItem[] {
    if (!canUseItems(state, view)) return []
    return state.carriedItems.map((carried) => ({
        uid: carried.item,
        name: getItemByIdOrUnknown(exec.game.items, carried.item).name,
        quantity: carried.quantity,
    }))
}

export function availableActions(exec: GameExecManager, state: State, view: RenderWidget = currentView(exec, state)): AvailableActions {
    const result: AvailableActions = {
        widget: view.widget,
        continueMode: null,
        continueDisabled: false,
        links: [],
        routes: [],
        zones: [],
        discussTopics: null,
        usableItems: usableItems(exec, state, view),
    }
    if (view.widget === "dialog" || view.widget === "char") {
        result.continueMode = continueModeOf(view)
        if (result.continueMode === "continue_link") {
            result.continueDisabled = Boolean(view.continueLink?.disabled)
        } else if (result.continueMode === null) {
            result.links = view.links
            if (view.widget === "char") {
                result.discussTopics = discussTopics(exec, state, view)
            }
        }
    } else if (view.widget === "location") {
        result.links = view.links
        result.routes = view.routes
    } else if (view.widget === "pac") {
        result.zones = view.items
    }
    return result
}

// ── Doing it ───────────────────────────────────────────────────────────────

/** Name of whoever is speaking on this screen, for the history log. */
function speakerName(exec: GameExecManager, state: State, view: RenderWidget): string | null {
    if (view.widget === "dialog") return view.actor?.name ?? null
    if (view.widget === "char") return exec.renderer.getCharInfoDescription(state, view.char.uid).name
    return null
}

function historyRecord(exec: GameExecManager, state: State, view: RenderWidget, text: string, answer: string): HistoryRecord {
    return { actor: speakerName(exec, state, view), text, answer, step: state.stepCount }
}

function hasValue<T>(v: T | null | undefined): v is T { return v !== undefined && v !== null }

/**
 * Apply one player move and return the next state. Throws PlayerActionError when
 * the move is not available on the current screen. Pass the `view` the player
 * actually saw, so a choice refers to exactly what was rendered; it is
 * re-rendered otherwise.
 */
export function applyAction(exec: GameExecManager, state: State, action: PlayerAction, view: RenderWidget = currentView(exec, state)): State {
    if (view.widget === "error") {
        throw new PlayerActionError(`Game is in an error state: ${view.errorText}`)
    }

    switch (action.type) {
        case "continue": {
            if (view.widget !== "dialog" && view.widget !== "char") {
                throw new PlayerActionError(`'continue' is only available on dialog or character screens (current: ${view.widget})`)
            }
            const mode = continueModeOf(view)
            if (mode === "next_page") {
                return exec.advanceDialogPage(state, view.text)
            }
            if (mode === "continue_link" && view.continueLink) {
                if (view.continueLink.disabled) {
                    throw new PlayerActionError(`Continue link is disabled: ${view.continueLink.disabledReason}`)
                }
                const record = historyRecord(exec, state, view, view.text, view.continueLink.text)
                return exec.dialogVariantApply(state, view.continueLink.link, record)
            }
            throw new PlayerActionError("Nothing to continue on this screen; choose one of the available links or actions")
        }

        case "link": {
            if (view.widget !== "dialog" && view.widget !== "char" && view.widget !== "location") {
                throw new PlayerActionError(`'choose_link' is not available on '${view.widget}' screens`)
            }
            if ((view.widget === "dialog" || view.widget === "char") && continueModeOf(view) !== null) {
                throw new PlayerActionError("Use action='continue' to advance the current text before choosing a link")
            }
            if (!hasValue(action.index)) {
                throw new PlayerActionError("'choose_link' requires 'index'")
            }
            const chosen = view.links.find((l) => l.index === action.index)
            if (!chosen) {
                throw new PlayerActionError(`Link index ${action.index} is not available (valid: 0..${Math.max(0, view.links.length - 1)})`)
            }
            if (chosen.disabled) {
                throw new PlayerActionError(`Link ${action.index} ('${chosen.text}') is disabled`)
            }
            const text = view.widget === "location" ? "" : view.text
            return exec.dialogVariantApply(state, chosen.link, historyRecord(exec, state, view, text, chosen.text))
        }

        case "route": {
            if (view.widget !== "location") {
                throw new PlayerActionError(`'travel' is only available on location screens (current: ${view.widget})`)
            }
            const route = hasValue(action.uid) && action.uid !== ""
                ? view.routes.find((r) => r.destination.uid === action.uid)
                : hasValue(action.index)
                    ? view.routes.find((r) => r.index === action.index)
                    : undefined
            if (!route) {
                throw new PlayerActionError("Matching location route not found; pass a valid route 'index' or 'target_id'")
            }
            if (route.disabled) {
                throw new PlayerActionError(`Route to '${route.name}' (${route.destination.uid}) is disabled`)
            }
            return exec.locRouteApply(state, route)
        }

        case "zone": {
            if (view.widget !== "pac") {
                throw new PlayerActionError(`'click_zone' is only available on point-and-click screens (current: ${view.widget})`)
            }
            const zone = hasValue(action.id) && action.id !== ""
                ? view.items.find((z) => z.zone.id === action.id)
                : hasValue(action.index)
                    ? view.items[action.index]
                    : undefined
            if (!zone) {
                throw new PlayerActionError("Matching scene zone not found; pass a valid zone 'target_id' or 'index'")
            }
            if (zone.disabled) {
                throw new PlayerActionError(`Zone '${zone.zone.name || zone.zone.id}' is disabled`)
            }
            const record = historyRecord(exec, state, view, "", zone.zone.name || zone.zone.id)
            return exec.pacZoneApply(state, zone.zone, record)
        }

        case "discuss": {
            if (view.widget !== "char") {
                throw new PlayerActionError(`'discuss' is only available in character conversations (current: ${view.widget})`)
            }
            if (continueModeOf(view) !== null) {
                throw new PlayerActionError("Use action='continue' before starting a discussion topic")
            }
            if (!action.topicType || !action.id) {
                throw new PlayerActionError("'discuss' requires both 'topic_type' ('char'|'fact'|'item'|'loc') and 'target_id'")
            }
            const topics = discussTopics(exec, state, view)
            const pool: Record<string, TopicItem[]> = { char: topics.people, fact: topics.facts, item: topics.items, loc: topics.places }
            const list = pool[action.topicType]
            if (!list) {
                throw new PlayerActionError(`Unknown topic_type '${action.topicType}'`)
            }
            if (!list.some((t) => t.uid === action.id)) {
                throw new PlayerActionError(`Topic '${action.id}' is not currently discussable under '${action.topicType}'`)
            }
            return exec.discuss(state, action.topicType, action.id, view.char.uid)
        }

        case "useItem": {
            if (!canUseItems(state, view)) {
                throw new PlayerActionError(`'use_item' is only available on dialog screens (current: ${view.widget})`)
            }
            if (!action.uid) {
                throw new PlayerActionError("'use_item' requires 'target_id' (item uid)")
            }
            if (!state.carriedItems.some((c) => c.item === action.uid)) {
                throw new PlayerActionError(`Item '${action.uid}' is not in inventory`)
            }
            return exec.useItemInDialog(state, action.uid)
        }

        default:
            throw new PlayerActionError(`Unknown action '${String((action as { type?: unknown }).type)}'`)
    }
}

// ── Inspection ─────────────────────────────────────────────────────────────

export interface InventoryEntry {
    uid: string
    name: string
    description: string
    quantity: number
    tags: string[]
    stats: Item["stats"]
    has_image: boolean
}

export interface FactEntry {
    uid: string
    short: string
    full: string
    discussable: boolean
}

export interface PersonEntry {
    uid: string
    name: string
    description: string
    has_avatar: boolean
    discussable: boolean
}

export interface PlaceEntry {
    uid: string
    name: string
    discussable: boolean
    visited: boolean
}

export function inventoryList(exec: GameExecManager, state: State): InventoryEntry[] {
    return state.carriedItems.map((carried) => {
        const item = getItemByIdOrUnknown(exec.game.items, carried.item)
        return {
            uid: carried.item,
            name: item.name,
            description: item.description,
            quantity: carried.quantity,
            tags: item.tags ?? [],
            stats: item.stats ?? {},
            has_image: Boolean((item.image || item.thumbnail || "").trim()),
        }
    })
}

export function factList(exec: GameExecManager, state: State): FactEntry[] {
    return state.knownFacts.map((uid) => {
        const fact = getFact(exec.game, uid) ?? createEmptyFact(uid)
        return { uid: fact.uid, short: fact.short, full: fact.full, discussable: fact.discussable }
    })
}

export function peopleList(exec: GameExecManager, state: State): PersonEntry[] {
    return state.knownPeople.map((uid) => {
        const descr = exec.renderer.getCharInfoDescription(state, uid)
        return {
            uid,
            name: descr.name,
            description: descr.description,
            has_avatar: Boolean(descr.avatar?.trim()),
            discussable: descr.charObject.discussable,
        }
    })
}

export function placeList(exec: GameExecManager, state: State): PlaceEntry[] {
    const visited = new Set(getVisitedLocations(state))
    return state.knownPlaces.map((uid) => {
        const loc = getLoc(exec.game, uid)
        return { uid, name: loc?.displayName || uid, discussable: loc?.discussable ?? true, visited: visited.has(uid) }
    })
}

// ── Debugging (developer tools: MCP debug_*, CLI debug player) ───────────────

const STATE_ARRAYS = [
    "positionStack",
    "positionHistory",
    "shortHistory",
    "knownFacts",
    "knownPeople",
    "knownPlaces",
    "notifications",
    "carriedItems",
    "happenedEvents",
] as const

/** Cheap structural guard so a bad debug edit fails loudly instead of corrupting a session. */
export function validateStateShape(state: unknown): asserts state is State {
    if (!state || typeof state !== "object" || Array.isArray(state)) {
        throw new Error("State must be an object")
    }
    const s = state as Record<string, unknown>
    if (!s.position || typeof s.position !== "object") {
        throw new Error("State.position must be an object")
    }
    if (!s.props || typeof s.props !== "object" || Array.isArray(s.props)) {
        throw new Error("State.props must be an object")
    }
    if (!s.progress || typeof s.progress !== "object") {
        throw new Error("State.progress must be an object")
    }
    if (typeof s.stepCount !== "number") {
        throw new Error("State.stepCount must be a number")
    }
    for (const key of STATE_ARRAYS) {
        if (!Array.isArray(s[key])) {
            throw new Error(`State.${key} must be an array`)
        }
    }
    for (const c of s.carriedItems as unknown[]) {
        const item = c as Record<string, unknown>
        if (!item || typeof item.item !== "string" || typeof item.quantity !== "number") {
            throw new Error("State.carriedItems entries must be {item: string, quantity: number}")
        }
    }
}

/** Throws unless `state.position` points at an existing window, location or talkable character. */
export function requireValidPosition(exec: GameExecManager, state: State): void {
    const pos = state.position as Partial<UiObjectId> & Record<string, unknown>
    const shape = JSON.stringify(pos)
    if (pos.kind === "window") {
        if (!exec.getCurrentDialogWindow(state)) {
            throw new Error(`No dialog window ${shape}; expected {kind:'window', dialog, window} of an existing window`)
        }
    } else if (pos.kind === "location") {
        if (!exec.getCurrentLocation(state)) {
            throw new Error(`No location ${shape}; expected {kind:'location', location:<loc uid>}`)
        }
    } else if (pos.kind === "chardialog") {
        if (!exec.getCurrentCharDialog(state)) {
            throw new Error(`No character conversation ${shape}; expected {kind:'chardialog', char:<char uid with a dialog>}`)
        }
    } else {
        throw new Error(`Invalid position ${shape}; kind must be 'window', 'location' or 'chardialog'`)
    }
}

export interface DebugApplyOptions {
    /** Teleport here first. */
    position?: UiObjectId | null
    /** rt script run after the teleport (fires hooks and notifications). */
    script?: string | null
    /** Run the entry of the (new) position; defaults to true only when `position` is given. */
    run_entry?: boolean | null
}

/**
 * Developer edit of a state: validate `base`, optionally teleport, run a script,
 * then optionally enter the position. Returns the new state; throws instead of
 * returning a state with a fresh fatal error.
 */
export function debugApply(exec: GameExecManager, base: State, options: DebugApplyOptions): State {
    validateStateShape(base)
    let state: State = JSON.parse(JSON.stringify(base))
    const hadError = Boolean(state.fatalError)

    if (options.position) {
        state.position = options.position
        state.dialogPage = 0
        state.quickReplyText = null
    }
    requireValidPosition(exec, state)
    if (state.position.kind === "location") {
        state.location = state.position.location
    } else if (state.position.kind === "chardialog") {
        state.charDialog = state.position.char
    }

    if (options.script && options.script.trim()) {
        state = exec.modifyStateScript(state, options.script)
        if (state.fatalError && !hadError) {
            throw new Error(`Debug script failed: ${state.fatalError.message}`)
        }
    }
    const runEntry = options.run_entry ?? Boolean(options.position)
    if (runEntry) {
        state = exec.executeEntry(state)
        if (state.fatalError && !hadError) {
            throw new Error(`Entry of ${JSON.stringify(state.position)} failed: ${state.fatalError.message}`)
        }
    }
    return state
}
