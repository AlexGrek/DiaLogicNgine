export interface Task {
    uid: string
    text: string
    critical: boolean // if failed - all quest will be failed
}

export interface Quest {
    uid: string
    tasks: Task[]
    name: string
    tags: string[]
    ordered: true
    onComplete?: string
    onFail?: string
}

export default interface QuestLine {
    uid: string
    name: string
    quests: Quest[]
    tags: string[]
}

export function createTask(questuid: string, index: number): Task {
    return {
        uid: `${questuid}Task${index+1}`,
        text: '',
        critical: true
    }
}

export function createTaskByUid(taskuid: string, index: number): Task {
    return {
        uid: taskuid,
        text: '',
        critical: true
    }
}

export function createQuest(questuid: string): Quest {
    return {
        uid: questuid,
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
