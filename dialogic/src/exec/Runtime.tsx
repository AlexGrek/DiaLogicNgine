import lodash, { isBoolean, isNumber, isString } from "lodash";
import { State } from "./GameState";
import { GameDescription } from "../game/GameDescription";
import Prop from "../game/Prop";

function addProp(object: any, prop: Prop) {
    const getOrDefault = (object: any, name: string, def: any) => {
        const state: State = object.state
        if (state.props[name] !== undefined) {
            return state.props[name]
        }
        return def
    }

    const setToState = (object: any, prop: Prop, value: any) => {
        const state: State = object.state
        switch (prop.datatype) {
            case "string":
                state.props[prop.name] = value != null ? value.toString() : "null"
                break;
            case "boolean":
                if (!isBoolean(value)) {
                    console.error(`Trying to set ${prop.name} boolean, got: ${JSON.stringify(value)}`)
                    state.props[prop.name] = prop.defaultValue
                }
                state.props[prop.name] = value
                break;
            case "number":
                if (!isNumber(value)) {
                    console.error(`Trying to set ${prop.name} number, got: ${JSON.stringify(value)}`)
                    state.props[prop.name] = prop.defaultValue
                }
                state.props[prop.name] = value
                break;
            case "variant":
                if (!isString(value) || prop.variants.indexOf(value) < 0) {
                    console.error(`Trying to set ${prop.name} variant, got: ${JSON.stringify(value)}`)
                    state.props[prop.name] = prop.defaultValue
                }
                state.props[prop.name] = value
                break;
        }
    }

    Object.defineProperty(object, prop.name, {
        get: function () { return getOrDefault(object, prop.name, prop.defaultValue) },
        set: function (value: any) { setToState(object, prop, value) }
    });
}

function addProps(object: any, game: GameDescription) {
    game.props.forEach(prop => {
        addProp(object, prop)
    })
    return object
}

export class RuntimeRt {
    state?: State
    props: any

    constructor(props: any, state?: State) {
        this.props = props
        if (state)
            this.setState(state)
    }

    public setState(s: State) {
        this.state = s
        console.log("Setting state")
        this.props.state = this.state
    }
}

export function createRtObject(game: GameDescription, state: State) {
    const propsHost: any = {}
    addProps(propsHost, game)
    var rt = new RuntimeRt(propsHost, state)
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
    const body = `(function (rt, state, props) { ${s} })`
    console.log(body)
    var stateCopy = lodash.cloneDeep(prevState)
    const rt = createRtObject(game, stateCopy)
    try {
        var newState = (window as any).eval.call(window, body)(rt, stateCopy, rt.props);
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

