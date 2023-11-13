import { LocalStorage } from "storage-manager-js"
import SaveGame, { GameStorage, createGameStorage } from "./Saves"
import lodash from "lodash"
import { trace } from "../Trace"

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

    public listAllSaves(): SaveGame[] {
        // create og read storage
        const storage = this.storage

        let saves = []
        if (storage.autoSave) {
            saves.push(storage.autoSave)
        }
        if (storage.prevAutoSave) {
            saves.push({...storage.prevAutoSave, name: "Autosave 2"})
        }
        saves = saves.concat(storage.quickSaves)
        saves = saves.concat(storage.saves)

        return saves
    }
}