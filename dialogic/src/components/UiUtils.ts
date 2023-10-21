import lodash from "lodash"
import Character from "../game/Character"
import { GameDescription } from "../game/GameDescription"
import { generateImageUrl } from "../Utils"


export const styleWithImage = (background?: string) => {
    if (background) {
        return {
            backgroundImage: `url("game_assets/${background}")`
        }
    }
    else
        return {}
}

export const avatarImageUrl = (game: GameDescription, characterOrUid: string | Character, image: string | number | undefined): string | null => {
    var character: Character;
    if (lodash.isString(characterOrUid)) {
        const charFound = game.chars.find(item => item.uid === characterOrUid)
        if (!charFound) {
            console.error(`Char ${characterOrUid} not found`)
            return null
        }
        character = charFound
    } else {
        character = characterOrUid
    }
    
    console.log(`Generating style: ${image}`)
    if (image === undefined) {
        if (character) {
            if (character.avatar.main) {
                return generateImageUrl(character.avatar.main);
            }
            return null;
        }
        return null
    }

    var imageUri: string | undefined;
    if (lodash.isNumber(image)) {
        if (image >= character.avatar.list.length) {
            console.error(`image ${image} not found it ${JSON.stringify(character)}`)
            return null
        }
        imageUri = character.avatar.list[image].uri
    }
    else {
        // it is string, I believe
        if (image === "main") {
            imageUri = character.avatar.main
        } else {
            // find by name
            const found = character.avatar.list.find(el => el.name === image)
            if (!found) {
                console.error(`image ${image} not found it ${JSON.stringify(character)}`)
                return null
            }
            imageUri = found.uri
        }
    }
    if (!imageUri) {
        return null
    }
    
    return generateImageUrl(imageUri)
}