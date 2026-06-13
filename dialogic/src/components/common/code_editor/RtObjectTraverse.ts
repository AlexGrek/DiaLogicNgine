import { GameExecManager } from "../../../exec/GameExecutor";
import { RuntimeRt, createRtObject } from "../../../exec/Runtime";
import { GameDescription } from "../../../game/GameDescription";

function traverseObjectProperties(obj: Record<string, unknown>) {
    const list = []
    for (const key in obj) {
        if (Object.hasOwn(obj, key)) {
            list.push(key)
        }
    }
    return list
}

export function traverseRt(rt: RuntimeRt) {
    // add props
    let all = traverseObjectProperties(rt.props).map(s => `props.${s}`)

    // add chars
    for (const ch in rt.ch) {
        const inChar = traverseObjectProperties(rt.ch[ch]).map(s => `ch.${ch}.${s}`)
        all = all.concat(inChar)
    }

    // add objectives
    for (const ql in rt.objectives) {
        if (Object.hasOwn(rt.objectives, ql) && !ql.startsWith('_')) {
            // add questline funcs and props
            const qlAction = `objectives.${ql}`
            const actions = ["open", "close"]
            const readableProps = ["status"]
            all.push(...actions.map(act => `${qlAction}.${act}()`))
            all.push(...readableProps.map(rp => `${qlAction}.${rp}`))

            // add each quest
            for (const q in rt.objectives[ql]) {
                if (Object.hasOwn(rt.objectives[ql], q) && !q.startsWith('_')) {
                    // add quest funcs and props
                    const qAction = `objectives.${ql}.${q}`
                    const actions = ["fail", "complete", "open"]
                    const readableProps = ["status"]
                    all.push(...actions.map(act => `${qAction}.${act}()`))
                    all.push(...readableProps.map(rp => `${qAction}.${rp}`))

                    // add each task
                    for (const task in rt.objectives[ql][q]) {
                        if (Object.hasOwn(rt.objectives[ql][q], task) && !task.startsWith('_')) {
                            // add task funcs and props
                            const taskAction = `objectives.${ql}.${q}.${task}`
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

    // General info — read-only entries derived from game.general
    const g = game.general
    initial["rt.general.name"]        = `game name: "${g.name}"`
    initial["rt.general.version"]     = `game version: "${g.version}"`
    initial["rt.general.description"] = `game description (read-only)`
    initial["rt.general.authors"]     = `authors: ${g.authors.join(", ")} (read-only array)`
    initial["rt.general.extras"]      = `additional info map (read-only)`
    for (const [key, val] of Object.entries(g.extras ?? {})) {
        initial[`rt.general.extras.${key}`] = `additional info — ${key}: ${val}`
    }

    // Reusable functions defined in the Scripting tab — callable from any script
    for (const fn of game.functions ?? []) {
        if (fn.name) {
            initial[`${fn.name}(${fn.args ?? ''})`] = fn.description
                ? `reusable function — ${fn.description}`
                : `reusable function ${fn.name}`
        }
    }

    return initial
}