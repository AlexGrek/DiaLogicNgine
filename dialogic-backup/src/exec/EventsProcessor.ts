import { GameExecManager } from "./GameExecutor"
import { State } from "./GameState"

export default class EventsProcessor {
    exec: GameExecManager

    constructor(exec: GameExecManager) {
        this.exec = exec
    }

    canHostEvents(state: State, eventHosts: string[] | null, canHostEventsScript: string | undefined) {
        if (eventHosts == null) {
            return false
        }
        return this.exec.getBoolDecisionWithDefault(state, true, canHostEventsScript)
    }
}