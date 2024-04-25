import lodash from "lodash"
import { LocalStorage } from "storage-manager-js"
import { trace } from "../Trace"
import { trimArray } from "../Utils"
import { State } from "../exec/GameState"
import SaveGame, { GameStorage, createGameStorage } from "./Saves"

export default class SavesManager {
    gameName: string

    constructor(name: string) {
        this.gameName = name
    }

    private get storageName() {
        return `savegame-${this.gameName}`
    }

    private get storage(): GameStorage {
        const propName = this.storageName
        if (LocalStorage.has(propName)) {
            const data = LocalStorage.get<GameStorage>(propName)
            if (data != null && !lodash.isString(data))
                return data
        }

        // create new storage
        trace(`Savegame storage "${propName}" initialized`)
        const newStorage = createGameStorage(this.gameName)
        LocalStorage.set(propName, newStorage)
        return newStorage
    }

    private updateStorage(s: GameStorage) {
        const propName = this.storageName
        trace(`Savegame storage "${propName}" updating`)
        LocalStorage.set(propName, s)
    }

    public listAllSaves(): SaveGame[] {
        // create og read storage
        const storage = this.storage

        let saves = []
        if (storage.autoSave) {
            saves.push(storage.autoSave)
        }
        if (storage.prevAutoSave) {
            saves.push({ ...storage.prevAutoSave})
        }
        saves = saves.concat(storage.quickSaves)
        saves = saves.concat(storage.saves)

        return saves
    }

    public newSave(save: State, name: string): void {
        const now = new Date()
        const nameToSave = name === '' ? now.toDateString() : name
        const newSave: SaveGame = {
            name: nameToSave,
            isAutosave: false,
            isQuicksave: false,
            gameName: this.gameName,
            created: now,
            state: save
        }
        const storage = this.storage
        storage.saves.unshift(newSave)
        this.updateStorage(storage)
    }

    public newQuickSave(save: State, name = ''): void {
        const now = new Date()
        const nameToSave = name === '' ? now.toDateString() : name
        const newSave: SaveGame = {
            name: `Quick: ${nameToSave}`,
            isAutosave: false,
            isQuicksave: true,
            gameName: this.gameName,
            created: now,
            state: save
        }
        const storage = this.storage
        storage.quickSaves.unshift(newSave)
        storage.quickSaves = trimArray(storage.quickSaves, 4)
        this.updateStorage(storage)
    }

    public newAutoSave(save: State, name = ''): void {
        const now = new Date()
        const nameToSave = name === '' ? now.toDateString() : name
        const newSave: SaveGame = {
            name: `Autosave: ${nameToSave}`,
            isAutosave: true,
            isQuicksave: false,
            gameName: this.gameName,
            created: now,
            state: save
        }
        const storage = this.storage
        if (storage.autoSave != null) {
            storage.prevAutoSave = storage.autoSave
        }
        storage.autoSave = newSave
        this.updateStorage(storage)
    }
}