import React from 'react';
import { Button, IconButton, Input } from 'rsuite';
import PlusIcon from '@rsuite/icons/Plus';
import MinusIcon from '@rsuite/icons/Minus';
import './StringListEditor.css'

interface StringListEditorProps {
    onChange: (update: string[]) => void;
    value: string[]
    canBeEmpty?: boolean
}

const StringListEditor: React.FC<StringListEditorProps> = ({onChange, value, canBeEmpty }) => {
    const canDeleteFirst = canBeEmpty === true

    const add = () => {
        onChange([...value, ""])
    }

    const removeAt = (i: number) => {
        const clone = [...value]
        clone.splice(i, 1)
        onChange(clone)
    }

    const editAt = (i: number, v: string) => {
        const clone = [...value]
        clone[i] = v
        onChange(clone)
    }

    const renderValues = () => {
        return value.map((val, i) => {
            const remove = <Button onClick={() => removeAt(i)}><MinusIcon/></Button>
            return <div className="string-list-editor-row">
                <Input key={i} value={val} onChange={(v) => editAt(i, v)}></Input>{i > 0 || canDeleteFirst ? remove : null}
            </div>
        })
    }

    return (
        <div>
            {renderValues()}
            <Button onClick={add}><PlusIcon/></Button>
        </div>
    );
};

export default StringListEditor;
