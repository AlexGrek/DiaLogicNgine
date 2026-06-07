import {
    HOOK_PREFIX_FACTS_DISCOVERED,
    HOOK_PREFIX_ITEMS_ACQUIRED,
    HOOK_PREFIX_ITEMS_LOST,
    HOOK_PREFIX_SITUATION_ENDED,
    HOOK_PREFIX_SITUATION_STARTED,
} from "../game/HookScript"
import { GameExecManager } from "./GameExecutor"
import { CarriedItem, State } from "./GameState"
import { evaluateAsStateProcessor } from "./Runtime"

// Multiple hooks may match a single event; they are called one by one in sequence.
// The order of execution among matching hooks is intentionally undefined —
// hooks are stored as an unordered list and must not rely on each other's execution order.

export default class HooksProcessor {
    exec: GameExecManager

    constructor(exec: GameExecManager) {
        this.exec = exec
    }

    // Run every hook whose `hook` field matches hookString, threading state through each in turn.
    fire(hookString: string, state: State): State {
        const matching = (this.exec.game.hooks ?? []).filter(h => h.hook === hookString)
        let current = state
        for (const hook of matching) {
            if (hook.body) {
                current = evaluateAsStateProcessor(this.exec.game, hook.body, this.exec, current)
            }
        }
        return current
    }

    // Inspect what changed between prev and next state, then fire all relevant lifecycle hooks.
    // Hook scripts themselves do not recursively trigger further lifecycle hooks.
    fireForStateTransition(prev: State, next: State): State {
        let current = next

        // Facts discovered
        for (const uid of next.knownFacts) {
            if (!prev.knownFacts.includes(uid)) {
                current = this.fire(HOOK_PREFIX_FACTS_DISCOVERED + uid, current)
            }
        }

        // Items acquired / lost — compare total quantities per item uid
        const prevQty = totalQtyByUid(prev.carriedItems)
        const nextQty = totalQtyByUid(next.carriedItems)

        const allUids = new Set([...prevQty.keys(), ...nextQty.keys()])
        for (const uid of allUids) {
            const before = prevQty.get(uid) ?? 0
            const after  = nextQty.get(uid) ?? 0
            if (after > before) {
                current = this.fire(HOOK_PREFIX_ITEMS_ACQUIRED + uid, current)
            } else if (after < before) {
                current = this.fire(HOOK_PREFIX_ITEMS_LOST + uid, current)
            }
        }

        // Situation started / ended
        if (prev.situation !== next.situation) {
            if (prev.situation !== undefined && prev.situation !== null) {
                current = this.fire(HOOK_PREFIX_SITUATION_ENDED + prev.situation, current)
            }
            if (next.situation !== undefined && next.situation !== null) {
                current = this.fire(HOOK_PREFIX_SITUATION_STARTED + next.situation, current)
            }
        }

        return current
    }
}

function totalQtyByUid(items: CarriedItem[]): Map<string, number> {
    const map = new Map<string, number>()
    for (const ci of items) {
        map.set(ci.item, (map.get(ci.item) ?? 0) + ci.quantity)
    }
    return map
}
