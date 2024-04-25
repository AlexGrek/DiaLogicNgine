import { GameDescription } from "./game/GameDescription"
import { KeyValuePair, LocalStorage } from "./Utils"

export interface GameList {
    games: { [key: string]: GameDescription }
}

export class SaveLoadManager {
    private readLs(key: string, initial: any) {
        if (LocalStorage.has(key)) {
            return LocalStorage.get(key)
        }
        else {
            return initial
        }
    }

    private saveLs(key: string, data: any) {
        LocalStorage.set(key, data)
    }

    private readGameList(): GameList {
        return this.readLs("gameList", { games: {} })
    }

    saveGameDescr(name: string, value: GameDescription) {
        const gameList = this.readGameList()
        gameList.games[name] = value
        this.saveLs("gameList", gameList)
    }

    loadGameDescr(name: string) {
        const gameList = this.readGameList()
        return gameList.games[name]
    }

    listGameDescr(): KeyValuePair<string, GameDescription>[] {
        const gameList = this.readGameList()
        return Object.entries(gameList.games).map(([key, value]) => ({ key: key, value: value }))
    }

    listGameNames(): string[] {
        const gameList = this.readGameList()
        return Object.entries(gameList.games).map(([key, _]) => key)
    }

    exists(name: string) {
        const gameList = this.readGameList()
        return gameList.games.hasOwnProperty(name)
    }
}