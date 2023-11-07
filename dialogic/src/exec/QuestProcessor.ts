import lodash from "lodash";
import { trace } from "../Trace";
import { GameDescription } from "../game/GameDescription";
import { Quest, getQuest, getQuestLine, getQuestTask } from "../game/Objectives";
import { GameExecManager } from "./GameExecutor";
import { GameProgress, ProgressUpdate, withResetProgressUpdate } from "./GameProgress";
import { State, createInGameNotification } from "./GameState";

const isEmptyUpdates = (u: ProgressUpdate) => {
    return u.completedTasks.length == 0 &&
        u.failedTasks.length === 0 &&
        u.openTasks.length === 0 &&
        u.completedQuests.length === 0 &&
        u.failedQuests.length === 0 &&
        u.openQuests.length === 0 &&
        u.openQuestLines.length === 0 &&
        u.closedQuestLines.length === 0
}

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
        trace(`Removing: ${objectString} from list of ${array.length}`)
        array.slice(index, 1)
        return array 
    }
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

function isQuestCompleted(game: GameDescription, progress: GameProgress, quest: Quest) {
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

    withProgress(state: State) {
        if (isEmptyUpdates(state.progress.updates)) {
            // do nothing if updates are empty
            return state
        }


        let progress = lodash.cloneDeep(state)
        progress = this.processTasks(progress)
        progress = this.processQuests(progress)
        progress = this.processQuestLines(progress)

        // TODO: call this thing recursive untill there are no more updates

        const progressReset = withResetProgressUpdate(progress.progress)
        return {...progress, progress: progressReset}
    }

    private processTasks(state: State): State {
        trace("Started tasks processing")
        let stateWithChanges = state

        stateWithChanges.progress.updates.failedTasks.forEach((taskId) => {
            trace(`Failed task: ${taskId.toString()}`)
            const found = getQuestTask(this.exec.game, taskId)
            if (!found)
                return
            const [qline, q, tsk] = found
            addIfNotExist(stateWithChanges.progress.failedTasks, taskId) // fail
            removeIfExist(stateWithChanges.progress.openTasks, taskId)
            stateWithChanges = this.exec.modifyStateScript(stateWithChanges, tsk.onFail)

            if (q.ordered || tsk.critical) {
                // fail the whole quest
                trace(`Failing the whole quest: ${q.path.toString()}`)
                addIfNotExist(stateWithChanges.progress.updates.failedQuests, q.path)
            }

            stateWithChanges.notifications.push(createInGameNotification("questprogress", q.name))
        })

        stateWithChanges.progress.updates.completedTasks.forEach((taskId) => {
            trace(`Completed task: ${taskId.toString()}`)
            const found = getQuestTask(this.exec.game, taskId)
            if (!found)
                return
            const [qline, q, tsk] = found
            addIfNotExist(stateWithChanges.progress.completedTasks, taskId)
            removeIfExist(stateWithChanges.progress.openTasks, taskId)
            stateWithChanges = this.exec.modifyStateScript(stateWithChanges, tsk.onComplete)

            // task passed - so quest may be completed
            const indexOfTask = q.tasks.findIndex((task) => task.uid = tsk.uid)
            if (indexOfTask === q.tasks.length - 1) {
                // this task is last
                trace("Last task processing: " + tsk.path.toString())
                if (isQuestCompleted(this.exec.game, stateWithChanges.progress, q)) {
                    // mark the whole as completed
                    addIfNotExist(stateWithChanges.progress.updates.completedQuests, q.path)
                }
            } else {
                // not the last task - so open next one, please
                const next = q.tasks[indexOfTask + 1]
                trace(`Next task: ${next.path.toString()}`)
                addIfNotExist(stateWithChanges.progress.updates.openTasks, next.path)
            }

            stateWithChanges.notifications.push(createInGameNotification("questprogress", q.name))
        })

        stateWithChanges.progress.updates.openTasks.forEach((taskId) => {
            trace(`Opening task: ${taskId.toString()}`)
            const found = getQuestTask(this.exec.game, taskId)
            if (!found)
                return
            const [qline, q, tsk] = found
            addIfNotExist(stateWithChanges.progress.openTasks, taskId) // open

            // open quest
            addIfNotExist(stateWithChanges.progress.updates.openQuests, q.path)

            // open quest line
            if (!stateWithChanges.progress.updates.openQuestLines.includes(qline.uid)) {
                trace(`Opening quest line as well: ${qline.name}`)
                stateWithChanges.progress.updates.openQuestLines.push(qline.uid)
            }
        })

        return stateWithChanges
    }

    private processQuests(state: State): State {
        trace("Started quests processing")
        let stateWithChanges = state

        stateWithChanges.progress.updates.completedQuests.forEach(questPath => {
            trace(`Completed quest: ${questPath.toString()}`)
            const found = getQuest(this.exec.game, questPath)
            if (!found)
                return
            const [qline, q] = found

            addIfNotExist(stateWithChanges.progress.completedQuests, questPath) // complete
            removeIfExist(stateWithChanges.progress.openQuests, questPath)

            stateWithChanges = this.exec.modifyStateScript(stateWithChanges, q.onComplete)

            stateWithChanges.notifications.push(createInGameNotification("questcompleted", q.name))
        })

        stateWithChanges.progress.updates.failedQuests.forEach(questPath => {
            trace(`Failed quest: ${questPath.toString()}`)
            const found = getQuest(this.exec.game, questPath)
            if (!found)
                return
            const [qline, q] = found

            addIfNotExist(stateWithChanges.progress.failedQuests, questPath) // fail
            removeIfExist(stateWithChanges.progress.openQuests, questPath)

            stateWithChanges = this.exec.modifyStateScript(stateWithChanges, q.onFail)

            stateWithChanges.notifications.push(createInGameNotification("questfailed", q.name))
            //TODO: close quest lines
        })

        stateWithChanges.progress.updates.openQuests.forEach(questPath => {
            trace(`Open quest: ${questPath.toString()}`)
            const found = getQuest(this.exec.game, questPath)
            if (!found)
                return
            const [qline, q] = found

            addIfNotExist(stateWithChanges.progress.openQuests, questPath) // open
            stateWithChanges = this.exec.modifyStateScript(stateWithChanges, q.onOpen)

            // open quest line
            if (!stateWithChanges.progress.updates.openQuestLines.includes(qline.uid)) {
                trace(`Opening quest line as well: ${qline.name}`)
                stateWithChanges.progress.updates.openQuestLines.push(qline.uid)
            }

            stateWithChanges.notifications.push(createInGameNotification("questnew", q.name))
        })

        return stateWithChanges
    }

    private processQuestLines(state: State): State {
        trace("Started questLines processing")
        let stateWithChanges = state

        stateWithChanges.progress.updates.openQuestLines.forEach(qlinePath => {
            const qline = getQuestLine(this.exec.game, qlinePath)
            if (qline == null)
                return

            // open quest line
            if (!stateWithChanges.progress.openQuestLines.includes(qline.uid)) {
                trace(`Opening quest line: ${qline.name}`)
                stateWithChanges.progress.openQuestLines.push(qline.uid)
            }

            stateWithChanges.notifications.push(createInGameNotification("questlineopen", qline.name))
        });

        stateWithChanges.progress.updates.closedQuestLines.forEach(qlinePath => {
            const qline = getQuestLine(this.exec.game, qlinePath)
            if (qline == null)
                return

            // remove quest line from opened
            stateWithChanges.progress.openQuestLines = stateWithChanges.progress.openQuestLines.filter(q => q != qlinePath)

            // close quest line
            if (!stateWithChanges.progress.closedQuestLines.includes(qline.uid)) {
                trace(`Closing quest line: ${qline.name}`)
                stateWithChanges.progress.closedQuestLines.push(qline.uid)
            }

            stateWithChanges.notifications.push(createInGameNotification("questlineopen", qline.name))
        });

        return stateWithChanges
    }
}