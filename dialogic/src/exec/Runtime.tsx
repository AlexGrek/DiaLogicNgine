import lodash from "lodash";
import { State } from "./GameState";

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

export function evaluateAsStateProcessor(s: string, prevState: State) {
    const body = `(function (state) { ${s} })`
    console.log(body)
    var stateCopy = lodash.cloneDeep(prevState)
    try {
        var newState = (window as any).eval.call(window, body)(stateCopy);
        if (stateIsValid(newState))
            return newState as State
        else {
            console.warn(`User code did not return correct state object, '${newState}' returned insted. Old state is used.`)
            return prevState
        }
    } catch (exception) {
        console.warn("Exception while processing user code")
        console.error(exception)
        return {...prevState, fatalError: {message: `Error in user code: ${exception}`, exception: exception}} as State
    }
}
