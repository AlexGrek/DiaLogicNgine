export interface Task {
    uid: string
    text: string
}

export interface Quest {
    uid: string
    tasks: Task[]
    name: string
    tags: string[]
    autoComplete: boolean
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
        text: ''
    }
}

export function createQuest(questuid: string): Quest {
    return {
        uid: questuid,
        tasks: [],
        tags: [],
        autoComplete: true,
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
