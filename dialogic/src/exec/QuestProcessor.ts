import lodash from "lodash";
import { trace } from "../Trace";
import { GameDescription } from "../game/GameDescription";
import QuestLine, { Quest, QuestPath, Task, getQuest, getQuestLine, getQuestTask } from "../game/Objectives";
import { GameExecManager } from "./GameExecutor";
import { GameProgress } from "./GameProgress";
import { State, createInGameNotification, safeStateUpdate } from "./GameState";

export type ObjectiveStatus = "open" | "failed" | "completed" | "untouched"

export function contains<T extends object>(array: T[], o: T) {
    const arrayOfStrings = array.map((item) => item.toString())
    return arrayOfStrings.includes(o.toString())
}

export function removeIfExist<T extends object>(array: T[], o: T) {
    const arrayOfStrings = array.map((item) => item.toString())
    const objectString = o.toString()
    const index = arrayOfStrings.indexOf(objectString)
    if (index >= 0) {
        // it's here, so remove
        // trace(`Removing: ${objectString} from list of ${JSON.stringify(array)}`)
        array.splice(index, 1)
        // trace(`Removed: ${objectString} at ${index} from list of ${JSON.stringify(array)}`)
        return array
    }
    // trace(`NOT Removing: ${objectString} from list of ${JSON.stringify(array)}`)
    // it's not there
    return array
}

export function addIfNotExist<T extends object>(array: T[], o: T) {
    const arrayOfStrings = array.map((item) => item.toString())
    const objectString = o.toString()
    if (arrayOfStrings.includes(objectString)) {
        return array // it's already there
    }
    // it's not there, add
    array.push(o)
    return array
}

function isQuestCompleted(progress: GameProgress, quest: Quest) {
    if (quest.ordered) {
        const lastTask = quest.tasks[quest.tasks.length - 1]
        if (contains(progress.completedTasks, lastTask.path)) {
            trace("Last task completed: " + quest.name)
            return true
        }
        return false
    }
    // check all tasks completed
    return quest.tasks.every((task) => {
        trace("All tasks completed: " + quest.name)
        return contains(progress.completedTasks, task.path)
    })
}

export default class QuestProcessor {
    exec: GameExecManager

    constructor(exec: GameExecManager) {
        this.exec = exec
    }

    private isQuestLineCompleted(state: State, questline: QuestLine) {
        // check all quests completed or failed
        return questline.quests.every((q) => {
            const status = this.getQuestStatus(state, q.path)
            return status === "completed" || status === "failed"
        })
    }

    getTaskStatus(state: State, task: Task): ObjectiveStatus {
        if (contains(state.progress.failedTasks, task.path)) {
            return "failed"
        }
        if (contains(state.progress.completedTasks, task.path)) {
            return "completed"
        }
        if (contains(state.progress.openTasks, task.path)) {
            return "open"
        }
        return "untouched"
    }

    getQuestStatus(state: State, quest: QuestPath): ObjectiveStatus {
        if (contains(state.progress.failedQuests, quest)) {
            return "failed"
        }
        if (contains(state.progress.completedQuests, quest)) {
            return "completed"
        }
        if (contains(state.progress.openQuests, quest)) {
            return "open"
        }
        return "untouched"
    }

    getQuestLineStatus(state: State, questLine: QuestLine): ObjectiveStatus {
        if (state.progress.closedQuestLines.includes(questLine.uid)) {
            return "completed"
        }
        if (state.progress.openQuestLines.includes(questLine.uid)) {
            return "open"
        }
        return "untouched"
    }

    failTask(state: State, task: Task) {
        trace(`Failed task: ${task.path.toString()}`)
        const taskId = task.path
        addIfNotExist(state.progress.failedTasks, taskId)
        removeIfExist(state.progress.openTasks, taskId)
        const stateUpdate = this.exec.modifyStateScript(state, task.onFail)
        safeStateUpdate(state, stateUpdate)

        const found = getQuestTask(this.exec.game, taskId)
        if (!found)
            return
        const [qline, q, tsk] = found

        if (q.ordered || tsk.critical) {
            // fail the whole quest
            trace(`Failing the whole quest: ${q.path.toString()}`)
            this.failQuest(state, q)
        }
        state.notifications.push(createInGameNotification("questprogress", q.name))
    }

    completeTask(state: State, task: Task) {
        trace(`Completed task: ${task.path.toString()}`)
        const taskId = task.path
        addIfNotExist(state.progress.completedTasks, taskId)
        removeIfExist(state.progress.openTasks, taskId)
        const stateUpdate = this.exec.modifyStateScript(state, task.onComplete)
        safeStateUpdate(state, stateUpdate)

        const found = getQuestTask(this.exec.game, taskId)
        if (!found)
            return
        const [qline, q, tsk] = found

        // task passed - so quest may be completed
        const indexOfTask = q.tasks.findIndex((task) => task.uid = tsk.uid)
        if (indexOfTask === q.tasks.length - 1) {
            // this task is last
            trace("Last task processing: " + tsk.path.toString())
            if (isQuestCompleted(state.progress, q)) {
                // mark the whole as completed
                this.completeQuest(state, q)
            }
        } else {
            // not the last task - so open next one, please
            const next = q.tasks[indexOfTask + 1]
            trace(`Next task: ${next.path.toString()}`)
            this.openTask(state, next)
        }

        state.notifications.push(createInGameNotification("questprogress", q.name))
    }

    openTask(state: State, task: Task) {
        trace(`Open task: ${task.path.toString()}`)
        const taskId = task.path
        addIfNotExist(state.progress.openTasks, taskId)

        const found = getQuestTask(this.exec.game, taskId)
        if (!found)
            return
        const [qline, q, tsk] = found

        // try to open quest and questline
        if (this.getQuestStatus(state, q.path) === "untouched") {
            this.openQuest(state, q)
        }
    }

    failQuest(state: State, quest: Quest) {
        const questPath = quest.path
        trace(`Failed quest: ${questPath.toString()}`)

        addIfNotExist(state.progress.failedQuests, questPath) // fail
        removeIfExist(state.progress.openQuests, questPath)

        const update = this.exec.modifyStateScript(state, quest.onFail)
        safeStateUpdate(state, update)

        // TODO: close quest line

        state.notifications.push(createInGameNotification("questfailed", quest.name))
    }

    openQuest(state: State, quest: Quest) {
        const questPath = quest.path
        trace(`Open quest: ${questPath.toString()}`)

        const status = this.getQuestStatus(state, quest.path)
        if (status !== "untouched") {
            trace(`Quest  ${questPath.toString()} is already touched, skipping`)
            return
        }

        const found = getQuest(this.exec.game, questPath)
        if (!found)
            return
        const [qline, q] = found

        addIfNotExist(state.progress.openQuests, questPath) // open

        const update = this.exec.modifyStateScript(state, quest.onOpen)
        safeStateUpdate(state, update)

        // try to open questline
        if (this.getQuestLineStatus(state, qline) === "untouched") {
            this.openQuestLine(state, qline)
        }

        // open first task if not open yet
        if (quest.tasks.length > 0) {
            const first = quest.tasks[0]
            if (this.getTaskStatus(state, first) === "untouched") {
                this.openTask(state, first)
            }
        }

        state.notifications.push(createInGameNotification("questnew", q.name))
    }

    completeQuest(state: State, quest: Quest) {
        const questPath = quest.path
        trace(`Completed quest: ${questPath.toString()}`)

        addIfNotExist(state.progress.completedQuests, questPath) // complete
        removeIfExist(state.progress.openQuests, questPath)

        const update = this.exec.modifyStateScript(state, quest.onComplete)
        safeStateUpdate(state, update)

        // TODO: close quest line

        state.notifications.push(createInGameNotification("questfailed", quest.name))
    }

    openQuestLine(state: State, qline: QuestLine) {
        trace(`Open quest line: ${qline.name}`)
        if (this.getQuestLineStatus(state, qline) !== "untouched") {
            return
        }
        state.progress.openQuestLines.push(qline.uid)
        state.notifications.push(createInGameNotification("questlineopen", qline.name))
    }

    closeQuestLine(state: State, qline: QuestLine) {
        trace(`Open quest line: ${qline.name}`)
        if (this.getQuestLineStatus(state, qline) === "completed") {
            return
        }

        state.progress.closedQuestLines.push(qline.uid)
         // remove quest line from opened
         state.progress.openQuestLines = state.progress.openQuestLines.filter(q => q != qline.uid)


        state.notifications.push(createInGameNotification("questlineclose", qline.name))
    }
}