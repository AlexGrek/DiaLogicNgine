import lodash, { isBoolean, isNumber, isString } from "lodash";
import { roleByUid } from "../game/Character";
import { GameDescription } from "../game/GameDescription";
import QuestLine, { Quest, Task } from "../game/Objectives";
import Prop from "../game/Prop";
import { GameExecManager } from "./GameExecutor";
import { CarriedItem, State } from "./GameState";
import { ObjectiveStatus } from "./QuestProcessor";
import { getItemByIdOrNull } from "../game/Items";

type StateProvider = () => State

function addProp(stateProvider: StateProvider, object: any, prop: Prop, prefix: string) {
    const getOrDefault = (stateProvider: StateProvider, _object: any, _name: string, prefix: string, def: any) => {
        const state: State = stateProvider()
        const fullname = `${prefix}${prop.name}`
        if (state.props[fullname] !== undefined) {
            return state.props[fullname]
        }
        return def
    }

    const setToState = (stateProvider: StateProvider, _object: any, prop: Prop, prefix: string, value: any) => {
        const state: State = stateProvider()
        const fullname = `${prefix}${prop.name}`
        switch (prop.datatype) {
            case "string":
                state.props[fullname] = value != null ? value.toString() : "null"
                break;
            case "boolean":
                if (!isBoolean(value)) {
                    console.error(`Trying to set ${fullname} boolean, got: ${JSON.stringify(value)}`)
                    state.props[fullname] = prop.defaultValue
                }
                state.props[fullname] = value
                break;
            case "number":
                if (!isNumber(value)) {
                    console.error(`Trying to set ${fullname} number, got: ${JSON.stringify(value)}`)
                    state.props[fullname] = prop.defaultValue
                }
                state.props[fullname] = value
                break;
            case "variant":
                if (!isString(value) || prop.variants.indexOf(value) < 0) {
                    console.error(`Trying to set ${fullname} variant, got: ${JSON.stringify(value)}`)
                    state.props[fullname] = prop.defaultValue
                }
                state.props[fullname] = value
                break;
        }
    }

    Object.defineProperty(object, prop.name, {
        configurable: true,
        enumerable: true,
        get: function () { return getOrDefault(stateProvider, object, prop.name, prefix, prop.defaultValue) },
        set: function (value: any) { setToState(stateProvider, object, prop, prefix, value) }
    });
}

function addProps(object: any, game: GameDescription) {
    game.props.forEach(prop => {
        addProp(() => object.state, object, prop, "")
    })
    return object
}

function addChars(chars: any, game: GameDescription) {
    game.chars.forEach(char => {
        const prefix = `char:${char.uid}_`
        const charObject = {}
        char.props.forEach(prop => {
            addProp(() => chars.state, charObject, prop, prefix)
        })
        char.roles.forEach(role => {
            const roleDescr = roleByUid(role, game)
            if (roleDescr !== undefined) {
                roleDescr.props.forEach(prop => {
                    addProp(() => chars.state, charObject, prop, prefix)
                })
            }
        })
        char.overrideProps.forEach(prop => {
            addProp(() => chars.state, charObject, prop, prefix)
        })
        chars[char.uid] = charObject
    })
    return chars
}

export class RuntimeFact {
    stateProvider!: () => State;
    uid!: string;

    constructor(stateProvider: () => State, uid: string) {
        this.uid = uid
        this.stateProvider = stateProvider
    }

    public get known() {
        const state = this.stateProvider()
        return state.knownFacts.includes(this.uid)
    }

    public know() {
        if (this.known) {
            return
        }
        const state = this.stateProvider()
        state.knownFacts.push(this.uid)
    }
}

export class RuntimeObjectiveQuestLine {
    _stateProvider!: () => State;
    _questline: QuestLine
    _context: GameExecManager

    constructor(context: GameExecManager, stateProvider: () => State, questline: QuestLine) {
        this._questline = questline
        this._context = context
        this._stateProvider = stateProvider
    }

    public open() {
        const state = this._stateProvider()
        this._context.quests.openQuestLine(state, this._questline)
    }

    public close() {
        const state = this._stateProvider()
        this._context.quests.closeQuestLine(state, this._questline)
    }

    public get status() {
        const state = this._stateProvider()
        return this._context.quests.getQuestLineStatus(state, this._questline)
    }
}

export class RuntimeHistoryAccessManager {
    _stateProvider!: () => State
    _context: GameExecManager

    constructor(context: GameExecManager, runtime: RuntimeRt) {
        this._context = context
        this._stateProvider = () => runtime.mustGetState()
    }

    public eventHappened(eventName: string) {
        return this._stateProvider().happenedEvents.includes(eventName)
    }

    public thisEventHappened(context: any) {
        return this._stateProvider().happenedEvents.includes(context["thisEvent"])
    }
}

export class RuntimeItemsManager {
    state!: State
    _context: GameExecManager

    constructor(context: GameExecManager) {
        this._context = context
    }

    private getIndexByItemId(carriedItems: CarriedItem[], uid: string): number {
        for (let i = 0; i < carriedItems.length; i++) {
            if (carriedItems[i].item === uid) {
                return i;
            }
        }
        return -1; // Return -1 if the item is not found
    }

    public add(itemUid: string) {
        let item = getItemByIdOrNull(this._context.game.items, itemUid);
        if (item != null) {
            let index = this.getIndexByItemId(this.state.carriedItems, itemUid);
            if (item.stackable && index >= 0) {
                // just increase number
                this.state.carriedItems[index].quantity += 1
            } else {
                // append to list
                this.state.carriedItems.push({ item: itemUid, quantity: 1 })
            }
        } else {
            console.error("Item not found: " + itemUid)
        }
    }

    public remove(itemUid: string) {
        // warning: ai-generated
        const index = this.getIndexByItemId(this.state.carriedItems, itemUid);
        if (index !== -1) {
            const item = this.state.carriedItems[index];
            if (item.quantity === 1) {
                // Remove the item from the carried items array if there is only one left
                this.state.carriedItems.splice(index, 1);
            } else {
                // Decrease the quantity if the item is stackable and there are multiple of it
                item.quantity -= 1;
            }
        } else {
            console.error("Item not found: " + itemUid);
        }
    }

    public list(): CarriedItem[] {
        return this.state.carriedItems;
    }

    public listWithTag(tag: string): CarriedItem[] {
        const carriedItemsWithTag: CarriedItem[] = [];
        this.state.carriedItems.forEach(carriedItem => {
            const item = getItemByIdOrNull(this._context.game.items, carriedItem.item);
            if (item && item.tags.includes(tag)) {
                carriedItemsWithTag.push(carriedItem);
            }
        });
        return carriedItemsWithTag;
    }


    public has(itemUid: string): boolean {
        return this.getIndexByItemId(this.state.carriedItems, itemUid) !== -1;
    }

    public count(itemUid: string): number {
        let count = 0;
        this.state.carriedItems.forEach(carriedItem => {
            if (carriedItem.item === itemUid) {
                count += carriedItem.quantity; // Add quantity for stackable and unstackable items
            }
        });
        return count;
    }

    public countTotal(): number {
        let count = 0;
        this.state.carriedItems.forEach(carriedItem => {
            count += carriedItem.quantity;
        });
        return count;
    }
}

export class RuntimeObjectiveQuest {
    _stateProvider!: () => State;
    _quest: Quest
    _context: GameExecManager

    constructor(context: GameExecManager, stateProvider: () => State, quest: Quest, _parent: QuestLine) {
        this._quest = quest
        this._context = context
        this._stateProvider = stateProvider
    }

    public fail() {
        const state = this._stateProvider()
        this._context.quests.failQuest(state, this._quest)
    }

    public complete() {
        const state = this._stateProvider()
        this._context.quests.completeQuest(state, this._quest)
    }

    public open() {
        const state = this._stateProvider()
        this._context.quests.openQuest(state, this._quest)
    }

    public get status(): ObjectiveStatus {
        const state = this._stateProvider()
        return this._context.quests.getQuestStatus(state, this._quest.path)
    }
}

export class RuntimeObjectiveTask {
    _stateProvider!: () => State;
    _task: Task
    _context: GameExecManager

    constructor(context: GameExecManager, stateProvider: () => State, task: Task) {
        this._task = task
        this._context = context
        this._stateProvider = stateProvider
    }

    public get status(): ObjectiveStatus {
        const state = this._stateProvider()
        return this._context.quests.getTaskStatus(state, this._task)
    }

    public get isCompleted() {
        return this.status === "completed"
    }

    public get isFailed() {
        return this.status === "failed"
    }

    public get isOpen() {
        return this.status === "open"
    }

    public fail() {
        const state = this._stateProvider()
        this._context.quests.failTask(state, this._task)
    }

    public complete() {
        const state = this._stateProvider()
        this._context.quests.completeTask(state, this._task)
    }

    public open() {
        const state = this._stateProvider()
        this._context.quests.openTask(state, this._task)
    }
}

function addRuntimeObjectives(game: GameDescription, rt: RuntimeRt) {
    const stateProvider = () => rt.mustGetState()
    const context = rt.contextManager
    const host: any = {}
    game.objectives.forEach(qline => {
        const rtqline: any = new RuntimeObjectiveQuestLine(context, stateProvider, qline)

        // add quests to the qline
        qline.quests.forEach(quest => {
            rtqline[quest.uid] = new RuntimeObjectiveQuest(context, stateProvider, quest, qline)

            // add tasks to the quest
            quest.tasks.forEach(task => {
                rtqline[quest.uid][task.uid] = new RuntimeObjectiveTask(context, stateProvider, task)
            })
        })

        host[qline.uid] = rtqline
    })
    return host
}

function addFacts(factsHost: any, game: GameDescription) {
    game.facts.forEach(fact => {
        const stateProvider = () => factsHost.state
        const rtfact = new RuntimeFact(stateProvider, fact.uid)
        factsHost[fact.uid] = rtfact
    })
}

export class RuntimeRt {
    state?: State
    props: any
    ch: any
    facts: any
    objectives: any
    items: RuntimeItemsManager
    history: RuntimeHistoryAccessManager
    contextManager: GameExecManager
    situation: string | undefined
    contextVars: any

    constructor(props: any, chars: any, facts: any, game: GameDescription, contextManager: GameExecManager, state?: State) {
        this.contextManager = contextManager
        this.props = props
        this.ch = chars
        this.facts = facts
        this.history = new RuntimeHistoryAccessManager(contextManager, this)
        this.objectives = addRuntimeObjectives(game, this)
        this.items = new RuntimeItemsManager(contextManager)
        if (state)
            this.setState(state)
    }

    public setState(s: State) {
        this.state = s
        this.props.state = this.state
        this.ch.state = this.state
        this.facts.state = this.state
        this.items.state = this.state
        this.situation = this.state.situation
    }

    public mustGetState(): State {
        if (!this.state) {
            throw Error("State is not defined while user code is running")
        }
        return this.state
    }
}

export function createRtObject(game: GameDescription, context: GameExecManager, state?: State) {
    const propsHost: any = {}
    const charsHost: any = {}
    const factsHost: any = {}
    addProps(propsHost, game)
    addChars(charsHost, game)
    addFacts(factsHost, game)
    const rt = new RuntimeRt(propsHost, charsHost, factsHost, game, context, state)
    return rt
}

export function stateIsValid(stateCandidate: any) {
    if (!stateCandidate)
        return false
    if (typeof stateCandidate != 'object' || Array.isArray(stateCandidate)) {
        return false
    }
    const keys = Object.keys(stateCandidate)
    const expectedProps = ["position", "positionStack", "props"]
    return expectedProps.every((prp) => keys.includes(prp))
}

function makeFunctionBody(s: string) {
    return `(function (rt, state, props, ch, facts, objectives, situation, items, context) { ${s} })`
}

function evaluate(game: GameDescription, s: string, execManager: GameExecManager, prevState: State, contextVars?: any): [any, State] {
    const body = makeFunctionBody(s)
    const stateCopy = lodash.cloneDeep(prevState)
    const rt = createRtObject(game, execManager, stateCopy)
    rt.contextVars = contextVars;
    const returned = (window as any).eval.call(window, body)(rt, stateCopy, rt.props, rt.ch, rt.facts, rt.objectives, rt.situation, rt.items, rt.contextVars);
    return [returned, stateCopy]
}

export function evaluateAsStateProcessor(game: GameDescription, s: string, execManager: GameExecManager, prevState: State, contextVars?: any) {
    try {
        const [newState, stateCopy] = evaluate(game, s, execManager, prevState, contextVars)
        if (stateIsValid(newState))
            return newState as State
        else {
            console.info(`User code did not return correct state object, '${newState}' returned instead. Modified state is used.`)
            return stateCopy
        }
    } catch (exception) {
        console.warn("Exception while processing user code")
        console.error(exception)
        return { ...prevState, fatalError: { message: `Error in user code: ${exception}`, exception: exception } } as State
    }
}

export function evaluateAsBoolProcessor(game: GameDescription, s: string, execManager: GameExecManager, prevState: State, contextVars?: any) {
    let state = prevState
    try {
        const [boolResult, stateCopy] = evaluate(game, s, execManager, prevState, contextVars)
        if (stateIsValid(stateCopy))
            state = stateCopy
        else {
            console.warn(`User code damaged state object, old state returned instead`)
        }
        if (isBoolean(boolResult)) {
            return { state: state, decision: boolResult }
        } else {
            return { state: state, decision: boolResult ? true : false } // convert to bool using ternary operator
        }
    } catch (exception) {
        console.warn("Exception while processing user code")
        console.error(exception)
        return { state: { ...prevState, fatalError: { message: `Error in user code (bool processor): ${exception}`, exception: exception } }, decision: false }
    }
}

export function evaluateAsAnyProcessor(game: GameDescription, s: string, execManager: GameExecManager, prevState: State, contextVars?: any) {
    let state = prevState
    try {
        const [anyResult, stateCopy] = evaluate(game, s, execManager, prevState, contextVars)
        if (stateIsValid(stateCopy))
            state = stateCopy
        else {
            console.warn(`User code damaged state object, old state returned instead`)
        }
        return { state: state, decision: anyResult }
    } catch (exception) {
        console.warn("Exception while processing user code")
        console.error(exception)
        return { state: { ...prevState, fatalError: { message: `Error in user code (bool processor): ${exception}`, exception: exception } }, decision: false }
    }
}

