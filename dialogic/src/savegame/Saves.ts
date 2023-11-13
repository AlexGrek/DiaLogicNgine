import { State } from "../exec/GameState"

export default interface SaveGame {
    name: string
    isAutosave: boolean
    isQuicksave: boolean
    gameName: string
    created: Date
    state: State
}

export interface GameStorage {
    name: string
    quickSaves: SaveGame[]
    autoSave: SaveGame | null
    prevAutoSave: SaveGame | null
    saves: SaveGame[]
}

export function createGameStorage(name: string): GameStorage {
    return {
        name: name,
        quickSaves: [],
        autoSave: null,
        prevAutoSave: null,
        saves: []
    }
}
