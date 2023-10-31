export interface GameProgress {
    // tasks
    completedTasks: string[]
    failedTasks: string[]
    openTasks: string[]

    // quests
    completedQuests: string[]
    failedQuests: string[]
    openQuests: string[]

    // quest lines (groups)
    openQuestLines: string[]
    closedQuestLines: string[]
}

export function createInitialGameProgress(): GameProgress {
   return {
    completedTasks: [],
    failedTasks: [],
    openTasks: [],

    // quests
    completedQuests: [],
    failedQuests: [],
    openQuests: [],

    // quest lines (groups)
    openQuestLines: [],
    closedQuestLines: [],
   }
}
