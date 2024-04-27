import { haveCommonElement, partition } from "../Utils"
import { createImmediateDialogLink } from "../game/Dialog"
import GameEvent from "../game/Events"
import { getLoc, getLocEventHosts } from "../game/Loc"
import { GameExecManager } from "./GameExecutor"
import { State } from "./GameState"

export default class EventsProcessor {
    
    exec: GameExecManager

    constructor(exec: GameExecManager) {
        this.exec = exec
    }

    canHostEvents(state: State, eventHosts: any[], canHostEventsScript: string | undefined) {
        if (eventHosts == null || eventHosts.length == 0) {
            return false
        }
        return this.exec.getBoolDecisionWithDefault(state, true, canHostEventsScript)
    }

    random0to100(): number {
        return Math.floor(Math.random() * 101); // Generates a random integer between 0 and 100
    }

    happen(oldState: State, event: GameEvent): State {
        if (event.link == null) {
            return oldState
        }
        let target = event.link
        return this.exec.followLink(oldState, createImmediateDialogLink(target));
    }

    processPossibleEvents(oldState: State, eventHosts: (string | null)[]): State {
        let hosts = []
        for (let host of eventHosts) {
            if (host != null) {
                hosts.push(host)
            }
        }
        let possibleEvents = this.exec.game.events.filter((ev) => haveCommonElement(ev.targets, hosts))
        console.log(`Possible events here: ${JSON.stringify(possibleEvents)}`)
        let [priority, nonPriority] = partition(possibleEvents, ev => ev.highPriority)

        // sort priority and non-priority separately
        const prioritySorted = priority.sort((a, b) => a.probability - b.probability)
        const nonPrioritySorted = nonPriority.sort((a, b) => b.probability - a.probability)
        console.log(`Priority: ${JSON.stringify(prioritySorted)}`)
        console.log(`Non-Priority: ${JSON.stringify(nonPrioritySorted)}`)

        for (let ev of [...prioritySorted, ...nonPrioritySorted]) {
            if (this.checkEventCanHappen(oldState, ev)) {
                // soooo the event can happen! But will it happen?
                let probability = ev.probability
                let chance = this.random0to100()
                if (chance <= probability) {
                    console.log(`Event happened with chance ${chance}: ${JSON.stringify(ev)}`)
                    return this.happen(oldState, ev)
                } else {
                    console.log(`Event not happened with chance ${chance}: ${JSON.stringify(ev)}`)
                }
            }
        }
        return oldState
    }

    checkEventCanHappen(state: State, event: GameEvent): boolean {
        return this.exec.getBoolDecisionWithDefault(state, true, event.canHappenScript, {"thisEvent": event.name})
    }

    withPossibleEvent(oldState: State): State {
        let pos = oldState.position
        if (pos.kind === "location") {
            // location can host events
            const loc = getLoc(this.exec.game, pos.location)
            if (!loc) {
                throw new Error(`Location ${loc} not found`)
            }
            const locEventHosts = getLocEventHosts(loc).filter(item => item != null)
            if (this.canHostEvents(oldState, locEventHosts, loc.canHostEventsScript)) {
                // can host events
                return this.processPossibleEvents(oldState, locEventHosts)
            }
        }
        return oldState
    }
}