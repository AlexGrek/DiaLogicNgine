import { GameExecManager } from "../../../exec/GameExecutor";
import { RuntimeObjectiveQuestLine, RuntimeRt, createRtObject } from "../../../exec/Runtime";
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
    // add props
    let all = traverseObjectProperties(rt.props).map(s => `props.${s}`)

    // add chars
    for (let ch in rt.ch) {
        const inChar = traverseObjectProperties(rt.ch[ch]).map(s => `ch.${ch}.${s}`)
        all = all.concat(inChar)
    }

    // add objectives
    for (let ql in rt.objectives) {
        if (rt.objectives.hasOwnProperty(ql) && !ql.startsWith('_')) {
            // add questline funcs and props
            const qlAction = `objetives.${ql}`
            const actions = ["open", "close"]
            const readableProps = ["status"]
            all.push(...actions.map(act => `${qlAction}.${act}()`))
            all.push(...readableProps.map(rp => `${qlAction}.${rp}`))

            // add each quest
            for (let q in rt.objectives[ql]) {
                if (rt.objectives[ql].hasOwnProperty(q) && !q.startsWith('_')) {
                    // add quest funcs and props
                    const qAction = `objetives.${ql}.${q}`
                    const actions = ["fail", "complete", "open"]
                    const readableProps = ["status"]
                    all.push(...actions.map(act => `${qAction}.${act}()`))
                    all.push(...readableProps.map(rp => `${qAction}.${rp}`))

                    // add each task
                    for (let task in rt.objectives[ql][q]) {
                        if (rt.objectives[ql][q].hasOwnProperty(task) && !task.startsWith('_')) {
                            // add task funcs and props
                            const taskAction = `objetives.${ql}.${q}.${task}`
                            const actions = ["fail", "complete", "open"]
                            const readableProps = ["status", "isCompleted", "isFailed", "isOpen"]
                            all.push(...actions.map(act => `${taskAction}.${act}()`))
                            all.push(...readableProps.map(rp => `${taskAction}.${rp}`))
                        }
                    }
                }
            }
        }
    }
    return all
}

export function createRtDoc(game: GameDescription): { [key: string]: string } {
    const rt = createRtObject(game, new GameExecManager(game))
    const initial: { [key: string]: string } = {}
    const variables = traverseRt(rt)
    variables.forEach((el) => {
        initial[el] = "custom property"
    })
    return initial
}