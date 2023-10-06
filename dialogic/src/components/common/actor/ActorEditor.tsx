import React from 'react';
import { GameDescription } from '../../../game/GameDescription';
import { Actor, createActor } from '../../../game/Dialog';
import './actor.css'
import { Checkbox, SelectPicker } from 'rsuite';
import lodash from 'lodash';
import { generateImageUrl } from '../../../Utils';

interface ActorEditorProps {
    game: GameDescription;
    value: Actor | undefined
    onChange: (update: Actor | undefined) => void
}

const ActorEditor: React.FC<ActorEditorProps> = ({ game, value, onChange }) => {

    const data = game.chars.map(ch => {
            return {value: ch.uid, label: ch.uid}
        })

    const changeChar = (val: string | null) => {
        var update;
        if (val === null || val === "") {
            onChange(undefined);
            return;
        }
        if (value === undefined) {
            update = createActor()
        } else {
            update = lodash.cloneDeep(value)
        }
        update.character = val;
        console.log(update)
        onChange(update);
    }

    const changeAvatar = (val: string | number | null | undefined) => {
        var update;
        if (value === undefined) {
            update = createActor()
        } else {
            update = lodash.cloneDeep(value)
        }
        if (update === undefined) {
            return;
        }
        update.avatar = val === null ? "main" : val;
        console.log(update)
        onChange(update);
    }

    const createDataForChar = (c: string) => {
        const char = game.chars.find(item => item.uid === c) 
        if (char === undefined) {
            return []
        }
        const images = char.avatar
        var items = images.list.map((image, i) => {
            const v = image.name ? image.name : i
            return {value: v, label: v}
        })
        // if (images.main) {
        //     const main = {value: "main", label: "main"}
        //     items = [ main, ...items]
        // }
        return items
    }

    const renderEditors = () => {
        if (value === undefined) {
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
            { value.avatar === undefined ? <div></div> : <SelectPicker data={createDataForChar(value.character)} value={value.avatar === "main" ? null : value.avatar} onChange={changeAvatar} placeholder="main"></SelectPicker>}
        </div>
    }

    const generateStyle = (image: string | number | undefined) => {
        console.log(`Generating style: ${image}`)
        if (image === undefined) {
            if (value?.character) {
                const char = game.chars.find(item => item.uid === value.character)
                if (char && char.avatar.main) {
                    return {backgroundImage: `url("${generateImageUrl(char.avatar.main)}")`}
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
        var imageUri: string | undefined;
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
        console.log(`Setting image: ${imageUri}`)
        return {backgroundImage: `url("${generateImageUrl(imageUri)}")`}
    }

    return (
        <div className='actor-editor-main' style={generateStyle(value?.avatar)}>
            Actor: <SelectPicker placeholder="no actor" data={data} value={value ? value.character : null} onChange={(val) => changeChar(val)}/>
            {value ? renderEditors() : null}
        </div>
    );
};

export default ActorEditor;
