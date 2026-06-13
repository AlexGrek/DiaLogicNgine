/**
 * A reusable function authored in the Scripting tab. Its body is injected into
 * the scope of every user script, so any script (entry/action/visibility/hook/…)
 * can call it by name. Inside the body the usual script context is available via
 * closure: rt, state, props, ch, facts, objectives, situation, items, context.
 */
export interface ScriptFunction {
    name: string        // JS identifier used to call the function
    args: string        // comma-separated parameter list, e.g. "a, b"
    body: string        // function body (JS)
    description: string // shown in the script editor docs / autocomplete
}

export function createEmptyScriptFunction(): ScriptFunction {
    return { name: "", args: "", body: "", description: "" }
}

/** Naive JS identifier check used to decide whether a function can be injected. */
export function isValidFunctionName(name: string): boolean {
    return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)
}
