import { GameExecManager } from "../../../exec/GameExecutor";
import { RuntimeRt, createRtObject } from "../../../exec/Runtime";
import { GameDescription } from "../../../game/GameDescription";

function traverseObjectProperties(obj: Record<string, any>) {
    const list = []
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            list.push(key)
        }
    }
    return list
}

export function traverseRt(rt: RuntimeRt) {
    let all = traverseObjectProperties(rt.props).map(s => `props.${s}`)
    for (let ch in rt.ch) {

        const inChar = traverseObjectProperties(rt.ch[ch]).map(s => `ch.${ch}.${s}`)
        all = all.concat(inChar)
    }
    return all
}

export function createRtDoc(game: GameDescription): {[key: string]: string}  {
    const rt = createRtObject(game, new GameExecManager(game))
    const initial: {[key: string]: string} = {}
    const variables = traverseRt(rt)
    variables.forEach((el) => {
        initial[el] = "custom property"
    })
    return initial
}