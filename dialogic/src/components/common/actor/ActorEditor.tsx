import React from 'react';
import { GameDescription } from '../../../game/GameDescription';
import { Actor, createActor } from '../../../game/Dialog';
import './actor.css'
import { Checkbox, SelectPicker, Toggle } from 'rsuite';
import lodash from 'lodash';
import { generateImageUrl } from '../../../Utils';

interface ActorEditorProps {
    game: GameDescription;
    value: Actor | null
    onChange: (update: Actor | undefined) => void
}

const ActorEditor: React.FC<ActorEditorProps> = ({ game, value, onChange }) => {

    const data = game.chars.map(ch => {
        return { value: ch.uid, label: ch.uid }
    })

    const changeChar = (val: string | null) => {
        let update;
        if (val === null || val === "") {
            onChange(undefined);
            return;
        }
        if (value === null) {
            update = createActor()
        } else {
            update = lodash.cloneDeep(value)
        }
        update.character = val;
        onChange(update);
    }

    const changeAvatar = (val: string | number | null | undefined) => {
        let update;
        if (value === null) {
            update = createActor()
        } else {
            update = lodash.cloneDeep(value)
        }
        if (update === undefined) {
            return;
        }
        update.avatar = val === null ? "main" : val;
        onChange(update);
    }

    const createDataForChar = (c: string) => {
        const char = game.chars.find(item => item.uid === c)
        if (char === undefined) {
            return []
        }
        const images = char.avatar
        const items = images.list.map((image, i) => {
            const v = image.name ? image.name : i
            return { value: v, label: v }
        })
        // if (images.main) {
        //     const main = {value: "main", label: "main"}
        //     items = [ main, ...items]
        // }
        return items
    }

    const renderEditors = () => {
        if (value === null) {
            return <p></p>
        }
        return <div>
            <Checkbox checked={value.avatar !== undefined} onChange={() => {
                if (value.avatar === undefined) {
                    // if we enable it - we have to set first image, so use index 0
                    changeAvatar("main")
                } else {
                    changeAvatar(undefined)
                }
            }}>Set different avatar</Checkbox>
            {value.avatar === undefined ? <div></div> : <SelectPicker data={createDataForChar(value.character)} value={value.avatar === "main" ? null : value.avatar} onChange={changeAvatar} placeholder="main"></SelectPicker>}
        </div>
    }

    const generateStyle = (image: string | number | undefined) => {
        if (image === undefined) {
            if (value?.character) {
                const char = game.chars.find(item => item.uid === value.character)
                if (char && char.avatar.main) {
                    return { backgroundImage: `url("${generateImageUrl(char.avatar.main)}")` }
                }
            }
            return {}
        }
        if (!value || !value.character) {
            return {}
        }
        const char = game.chars.find(item => item.uid === value.character)
        if (!char) {
            return {}
        }
        let imageUri: string | undefined;
        if (lodash.isNumber(image)) {
            if (image >= char.avatar.list.length) {
                console.error(`image ${image} not found it ${JSON.stringify(char)}`)
                return {}
            }
            imageUri = char.avatar.list[image].uri
        }
        else {
            // it is string, I believe
            if (image === "main") {
                imageUri = char.avatar.main
            } else {
                // find by name
                const found = char.avatar.list.find(el => el.name === image)
                if (!found) {
                    console.error(`image ${image} not found it ${JSON.stringify(char)}`)
                    return {}
                }
                imageUri = found.uri
            }
        }
        if (!imageUri) {
            return {}
        }
        return { backgroundImage: `url("${generateImageUrl(imageUri)}")` }
    }

    const setCurrentChar = (val: boolean) => {
        if (val) {
            const was = value ? value : createActor()
            onChange({ ...was, currentCharacter: true })
        } else {
            // false is the new value
            onChange(undefined)
        }
    }

    const isCurrentChar = value && value.currentCharacter

    return (
        <div className='actor-editor-main' style={generateStyle(value?.avatar)}>
            Actor:
            <Toggle checkedChildren="Current dialog character" unCheckedChildren="Current dialog character" checked={!!isCurrentChar} onChange={(val) => setCurrentChar(val)} />
            <br></br>
            {!isCurrentChar && <SelectPicker placeholder="no actor" data={data} value={value ? value.character : null} onChange={(val) => changeChar(val)} />}
            {value && !isCurrentChar ? renderEditors() : null}
        </div>
    );
};

export default ActorEditor;
