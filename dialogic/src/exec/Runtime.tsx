import lodash from "lodash";
import { State } from "./GameState";

export function evaluateAsStateProcessor(s: string, prevState: State) {
    const body = `(function (state) { ${s} })`
    console.log(body)
    var stateCopy = lodash.cloneDeep(prevState)
    var newState = (window as any).eval.call(window, body)(stateCopy);
    return newState
}
