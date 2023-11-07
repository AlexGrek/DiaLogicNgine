import { GameDescription } from "./GameDescription"

export type QuestPath = [string, string]
export type TaskPath = [string, string, string]

export interface Task {
    path: TaskPath
    uid: string
    text: string
    critical: boolean // if failed - all quest will be failed

    // code
    onComplete?: string
    onFail?: string
    autoCheckScript?: string // call this always if the task is open
}

export interface Quest {
    uid: string
    path: QuestPath
    tasks: Task[]
    name: string
    tags: string[]
    ordered: true
    onComplete?: string
    onFail?: string
    onOpen?: string
}

export default interface QuestLine {
    uid: string
    name: string
    quests: Quest[]
    tags: string[]
}

export function createTask(questuid: QuestPath, index: number): Task {
    const uid = `${questuid[1]}Task${index+1}`
    return {
        uid: uid,
        text: '',
        critical: true,
        path: [questuid[0], questuid[1], uid]
    }
}

export function createTaskByUid(taskuid: string, questuid: QuestPath): Task {
    return {
        uid: taskuid,
        text: '',
        critical: true,
        path: [questuid[0], questuid[1], taskuid]
    }
}

export function createQuest(questuid: string, lineUID: string): Quest {
    return {
        uid: questuid,
        path: [lineUID, questuid],
        tasks: [],
        tags: [],
        ordered: true,
        name: ''
    }
}

export function createQuestLine(uid: string): QuestLine {
    return {
        uid: uid,
        tags: [],
        quests: [],
        name: ''
    }
}

export function getQuestLine(game: GameDescription, uid: string): QuestLine | null {
    const line = game.objectives.find(o => o.uid === uid)
    return line || null
}
 
export function getQuest(game: GameDescription, uid: QuestPath) : [QuestLine, Quest] | null {
    const [qline, q] = uid
    const line = game.objectives.find(o => o.uid === qline)
    if (!line)
        return null
    const quest = line.quests.find(qst => qst.uid === q)
    if (!quest)
        return null
    return [line, quest]
}

export function getQuestTask(game: GameDescription, uid: TaskPath): [QuestLine, Quest, Task] | null {
    const [qline, q, tsk] = uid
    const line = game.objectives.find(o => o.uid === qline)
    if (!line)
        return null
    const quest = line.quests.find(qst => qst.uid === q)
    if (!quest)
        return null
    const task = quest.tasks.find(t => t.uid === tsk)
    if (!task)
        return null
    return [line, quest, task]
}
