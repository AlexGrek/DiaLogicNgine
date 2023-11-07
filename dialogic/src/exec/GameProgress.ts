import { GameDescription } from "../game/GameDescription"
import { QuestPath, TaskPath } from "../game/Objectives"

// export interface ProgressUpdate {
//         // tasks
//         completedTasks: TaskPath[]
//         failedTasks: TaskPath[]
//         openTasks: TaskPath[]
    
//         // quests
//         completedQuests: QuestPath[]
//         failedQuests: QuestPath[]
//         openQuests: QuestPath[]
    
//         // quest lines (groups)
//         openQuestLines: string[]
//         closedQuestLines: string[]
// }

export interface GameProgress {
    // tasks
    completedTasks: TaskPath[]
    failedTasks: TaskPath[]
    openTasks: TaskPath[]

    // quests
    completedQuests: QuestPath[]
    failedQuests: QuestPath[]
    openQuests: QuestPath[]

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

    // updates: emptyProgressUpdate()
   }
}

// export function emptyProgressUpdate(): ProgressUpdate {
//     return {
//         completedTasks: [],
//         failedTasks: [],
//         openTasks: [],
    
//         // quests
//         completedQuests: [],
//         failedQuests: [],
//         openQuests: [],
    
//         // quest lines (groups)
//         openQuestLines: [],
//         closedQuestLines: [],
//        }
// }

// export function withResetProgressUpdate(progress: GameProgress): GameProgress {
//     return {...progress, updates: emptyProgressUpdate()}
// }
