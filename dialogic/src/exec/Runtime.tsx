import lodash, { isBoolean, isNumber, isString } from "lodash";
import { State } from "./GameState";
import { GameDescription } from "../game/GameDescription";
import Prop from "../game/Prop";
import { roleByUid } from "../game/Character";

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

export class RuntimeRt {
    state?: State
    props: any
    ch: any

    constructor(props: any, chars: any, state?: State) {
        this.props = props
        this.ch = chars
        if (state)
            this.setState(state)
    }

    public setState(s: State) {
        this.state = s
        console.log("Setting state")
        this.props.state = this.state
        this.ch.state = this.state
    }
}

export function createRtObject(game: GameDescription, state?: State) {
    const propsHost: any = {}
    const charsHost: any = {}
    addProps(propsHost, game)
    addChars(charsHost, game)
    var rt = new RuntimeRt(propsHost, charsHost, state)
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

export function evaluateAsStateProcessor(game: GameDescription, s: string, prevState: State) {
    const body = `(function (rt, state, props, ch) { ${s} })`
    console.log(body)
    var stateCopy = lodash.cloneDeep(prevState)
    const rt = createRtObject(game, stateCopy)
    try {
        var newState = (window as any).eval.call(window, body)(rt, stateCopy, rt.props, rt.ch);
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

export function evaluateAsBoolProcessor(game: GameDescription, s: string, prevState: State) {
    const body = `(function (rt, state, props) { ${s} })`
    console.log(body)
    var state = prevState
    var stateCopy = lodash.cloneDeep(prevState)
    const rt = createRtObject(game, stateCopy)
    try {
        var boolResult = (window as any).eval.call(window, body)(rt, stateCopy, rt.props);
        if (stateIsValid(stateCopy))
            state = stateCopy
        else {
            console.warn(`User code damaged state object, old state returned instead`)
        }
        if (isBoolean(boolResult)) {
            return {state: state, decision: boolResult}
        } else {
            return {state: state, decision: boolResult ? true : false} // convert to bool using ternary operator
        }
    } catch (exception) {
        console.warn("Exception while processing user code")
        console.error(exception)
        return {state: { ...prevState, fatalError: { message: `Error in user code (bool processor): ${exception}`, exception: exception } }, decision: false}
    }
}

export function evaluateAsAnyProcessor(game: GameDescription, s: string, prevState: State) {
    const body = `(function (rt, state, props) { ${s} })`
    console.log(body)
    var state = prevState
    var stateCopy = lodash.cloneDeep(prevState)
    const rt = createRtObject(game, stateCopy)
    try {
        var boolResult = (window as any).eval.call(window, body)(rt, stateCopy, rt.props);
        if (stateIsValid(stateCopy))
            state = stateCopy
        else {
            console.warn(`User code damaged state object, old state returned instead`)
        }
        return {state: state, decision: boolResult}
    } catch (exception) {
        console.warn("Exception while processing user code")
        console.error(exception)
        return {state: { ...prevState, fatalError: { message: `Error in user code (bool processor): ${exception}`, exception: exception } }, decision: false}
    }
}

