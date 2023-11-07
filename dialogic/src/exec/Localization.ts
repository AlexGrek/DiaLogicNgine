import lodash from "lodash"
import { GameDescription } from "../game/GameDescription"

export type Translations = { [key: string]: string | number }

export class LocalizationManager {
    translations: Translations

    constructor(game: GameDescription) {
        this.translations = game.translations
    }

    local(defaultString: string): string {
        const value = this.translations[defaultString]
        if (value === undefined || value === null || lodash.isNumber(value) || value === "") {
            return defaultString
        }
        return value
    }
}

export function createTranslations(): Translations {
    return {
        "Discuss...": "",
        "Facts": "",
        "Inventory": "",
        "Menu": "",
        "Journal": "",
        "Known people": "",
        "People": "",
        "Items": "",
        "Places": "",
        "Cancel": "",
        "Open": "",
        "Failed": "",
        "Completed": "",
    }
}