import lodash, { isBoolean, isNumber, isString } from "lodash";
import { roleByUid } from "../game/Character";
import { GameDescription } from "../game/GameDescription";
import QuestLine, { Quest, Task } from "../game/Objectives";
import Prop from "../game/Prop";
import { GameExecManager } from "./GameExecutor";
import { State } from "./GameState";
import { ObjectiveStatus } from "./QuestProcessor";

type StateProvider = () => State

function addProp(stateProvider: StateProvider, object: any, prop: Prop, prefix: string) {
    const getOrDefault = (stateProvider: StateProvider, object: any, name: string, prefix: string, def: any) => {
        const state: State = stateProvider()
        const fullname = `${prefix}${prop.name}`
        if (state.props[fullname] !== undefined) {
            return state.props[fullname]
        }
        return def
    }

    const setToState = (stateProvider: StateProvider, object: any, prop: Prop, prefix: string, value: any) => {
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

export class RuntimeObjectiveQuest {
    _stateProvider!: () => State;
    _quest: Quest
    _context: GameExecManager

    constructor(context: GameExecManager, stateProvider: () => State, quest: Quest, parent: QuestLine) {
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
    const context = rt.context
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
    context: GameExecManager

    constructor(props: any, chars: any, facts: any, game: GameDescription, context: GameExecManager, state?: State) {
        this.context = context
        this.props = props
        this.ch = chars
        this.facts = facts
        this.objectives = addRuntimeObjectives(game, this)
        if (state)
            this.setState(state)
    }

    public setState(s: State) {
        this.state = s
        console.log("Setting state")
        this.props.state = this.state
        this.ch.state = this.state
        this.facts.state = this.state
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
    var rt = new RuntimeRt(propsHost, charsHost, factsHost, game, context, state)
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
    return `(function (rt, state, props, ch, facts) { ${s} })`
}

export function evaluateAsStateProcessor(game: GameDescription, s: string, execManager: GameExecManager, prevState: State) {
    const body = makeFunctionBody(s)
    console.log(body)
    var stateCopy = lodash.cloneDeep(prevState)
    const rt = createRtObject(game, execManager, stateCopy)
    try {
        var newState = (window as any).eval.call(window, body)(rt, stateCopy, rt.props, rt.ch, rt.facts);
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

export function evaluateAsBoolProcessor(game: GameDescription, s: string, execManager: GameExecManager, prevState: State) {
    const body = makeFunctionBody(s)
    console.log(body)
    var state = prevState
    var stateCopy = lodash.cloneDeep(prevState)
    const rt = createRtObject(game, execManager, stateCopy)
    try {
        var boolResult = (window as any).eval.call(window, body)(rt, stateCopy, rt.props, rt.ch, rt.facts);
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

export function evaluateAsAnyProcessor(game: GameDescription, s: string, execManager: GameExecManager, prevState: State) {
    const body = makeFunctionBody(s)
    console.log(body)
    var state = prevState
    var stateCopy = lodash.cloneDeep(prevState)
    const rt = createRtObject(game, execManager, stateCopy)
    try {
        var boolResult = (window as any).eval.call(window, body)(rt, stateCopy, rt.props, rt.ch, rt.facts);
        if (stateIsValid(stateCopy))
            state = stateCopy
        else {
            console.warn(`User code damaged state object, old state returned instead`)
        }
        return { state: state, decision: boolResult }
    } catch (exception) {
        console.warn("Exception while processing user code")
        console.error(exception)
        return { state: { ...prevState, fatalError: { message: `Error in user code (bool processor): ${exception}`, exception: exception } }, decision: false }
    }
}

