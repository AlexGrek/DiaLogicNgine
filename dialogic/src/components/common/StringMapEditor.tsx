import MinusIcon from '@rsuite/icons/Minus';
import PlusIcon from '@rsuite/icons/Plus';
import React, { useEffect, useState } from 'react';
import { Button, Input } from 'rsuite';
import './StringListEditor.css';
import lodash from 'lodash';
import { isNumeric } from '../../Utils';

interface KVPair {
    key: string;
    value: string
}

interface StringMapEditorProps {
    onChange: (update: { [key: string]: number | string }) => void;
    value: { [key: string]: number | string }
    canBeEmpty?: boolean
}

const StringMapEditor: React.FC<StringMapEditorProps> = ({ onChange, value, canBeEmpty }) => {
    const canDeleteFirst = canBeEmpty === true || canBeEmpty === undefined
    const [newKey, setNewKey] = useState<string>("");
    const [state, setState] = useState<KVPair[]>([]);

    useEffect(() => {
        const items = []
        for (let key in value) {
            if (value.hasOwnProperty(key)) {
                let item = value[key];
                items.push({key: key, value: item.toString()})
            }
        }
        setState(items);
    }, [value]);

    const add = () => {
        const clone = lodash.cloneDeep(value)
        if (newKey === "") {
            return
        }
        setNewKey("")
        clone[newKey] = ""
        onChange(clone)
    }

    const removeAt = (i: string) => {
        const clone = lodash.cloneDeep(value)
        delete clone[i]
        onChange(clone)
    }

    const editAt = (i: number, v: string) => {
        const clone = [...state]
        clone[i] = { ...clone[i], value: v}
        setState(clone)
    }

    const renderValues = () => {
        return state.map((pair, i) => {
            const {key, value} = pair
            const remove = <Button onClick={() => removeAt(key)}><MinusIcon/></Button>
                const renderItem = <div className="string-map-editor-row" key={i}>
                    <div className="string-map-editor-key">{key} = </div><Input value={value} onChange={(v) => editAt(i, v)}></Input>{i > 0 || canDeleteFirst ? remove : null}
                </div>
            return renderItem
        })
    }

    const updateValue = () => {
        const updated: { [key: string]: number | string } = {}
        state.forEach(pair => {
            const realVal = isNumeric(pair.value) ? parseFloat(pair.value) : pair.value
            updated[pair.key] = realVal
        })
        onChange(updated)
    }

    return (
        <div onBlur={() => updateValue()}>
            {renderValues()}
            <div className="string-map-editor-row"><Input value={newKey} onPressEnter={() => add()} onChange={setNewKey} placeholder='stat'/><Button onClick={add}><PlusIcon /></Button></div>
        </div>
    );
};

export default StringMapEditor;
