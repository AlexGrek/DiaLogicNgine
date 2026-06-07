export interface HookScript {
    name: string
    hook: string
    body: string
}

export function createEmptyHookScript(): HookScript {
    return { name: "", hook: "", body: "" }
}

// ── Fact lifecycle ──────────────────────────────────────────────────────────
export const HOOK_PREFIX_FACTS_DISCOVERED  = "FACTS::DISCOVERED::"
export function makeFactDiscoveredHook(factUid: string) { return HOOK_PREFIX_FACTS_DISCOVERED + factUid }

// ── Item lifecycle ──────────────────────────────────────────────────────────
export const HOOK_PREFIX_ITEMS_ACQUIRED = "ITEMS::ACQUIRED::"
export const HOOK_PREFIX_ITEMS_LOST     = "ITEMS::LOST::"
export function makeItemAcquiredHook(itemUid: string) { return HOOK_PREFIX_ITEMS_ACQUIRED + itemUid }
export function makeItemLostHook(itemUid: string)     { return HOOK_PREFIX_ITEMS_LOST     + itemUid }

// ── Situation lifecycle ─────────────────────────────────────────────────────
export const HOOK_PREFIX_SITUATION_STARTED = "SITUATION::STARTED::"
export const HOOK_PREFIX_SITUATION_ENDED   = "SITUATION::ENDED::"
export function makeSituationStartedHook(situation: string) { return HOOK_PREFIX_SITUATION_STARTED + situation }
export function makeSituationEndedHook(situation: string)   { return HOOK_PREFIX_SITUATION_ENDED   + situation }

// ── Quest lifecycle ─────────────────────────────────────────────────────────
// Paths are joined with "::" — e.g. "QUEST::OPENED::my_questline::my_quest"
export const HOOK_PREFIX_QUEST_OPENED    = "QUEST::OPENED::"
export const HOOK_PREFIX_QUEST_COMPLETED = "QUEST::COMPLETED::"
export const HOOK_PREFIX_QUEST_FAILED    = "QUEST::FAILED::"
export function makeQuestOpenedHook(path: readonly string[])    { return HOOK_PREFIX_QUEST_OPENED    + path.join("::") }
export function makeQuestCompletedHook(path: readonly string[]) { return HOOK_PREFIX_QUEST_COMPLETED + path.join("::") }
export function makeQuestFailedHook(path: readonly string[])    { return HOOK_PREFIX_QUEST_FAILED    + path.join("::") }

// ── Task lifecycle ───���──────────────────────────────────────────────────────
// e.g. "TASK::COMPLETED::my_questline::my_quest::my_task"
export const HOOK_PREFIX_TASK_OPENED    = "TASK::OPENED::"
export const HOOK_PREFIX_TASK_COMPLETED = "TASK::COMPLETED::"
export const HOOK_PREFIX_TASK_FAILED    = "TASK::FAILED::"
export function makeTaskOpenedHook(path: readonly string[])    { return HOOK_PREFIX_TASK_OPENED    + path.join("::") }
export function makeTaskCompletedHook(path: readonly string[]) { return HOOK_PREFIX_TASK_COMPLETED + path.join("::") }
export function makeTaskFailedHook(path: readonly string[])    { return HOOK_PREFIX_TASK_FAILED    + path.join("::") }

// ── Quest-line lifecycle ────────────────────────────────────────────────────
export const HOOK_PREFIX_QUESTLINE_OPENED = "QUESTLINE::OPENED::"
export const HOOK_PREFIX_QUESTLINE_CLOSED = "QUESTLINE::CLOSED::"
export function makeQuestLineOpenedHook(uid: string) { return HOOK_PREFIX_QUESTLINE_OPENED + uid }
export function makeQuestLineClosedHook(uid: string) { return HOOK_PREFIX_QUESTLINE_CLOSED + uid }
