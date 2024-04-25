import PlusIcon from '@rsuite/icons/Plus';
import CloseIcon from '@rsuite/icons/Close';
import React from 'react';
import { Button, Input, InputGroup } from 'rsuite';
import './StringListEditor.css';

interface StringListEditorProps {
    onChange: (update: string[]) => void;
    value: string[]
    canBeEmpty?: boolean
    editTextOnly?: boolean
}

const StringListEditor: React.FC<StringListEditorProps> = ({onChange, value, canBeEmpty, editTextOnly }) => {
    const canDeleteFirst = canBeEmpty === true
    const [list, setList] = React.useState<string[]>(value)

    React.useEffect(() => {
        setList(value)
    }, [value])

    const add = () => {
        setList([...value, ""])
    }

    const removeAt = (i: number) => {
        const clone = [...value]
        clone.splice(i, 1)
        setList(clone)
    }

    const editAt = (i: number, v: string) => {
        const clone = [...value]
        clone[i] = v
        setList(clone)
    }

    const renderValues = () => {
        return list.map((val, i) => {
            const remove = editTextOnly ? null : <InputGroup.Button onClick={() => removeAt(i)}><CloseIcon/></InputGroup.Button>
            return <div key={i} className="string-list-editor-row">
                <InputGroup>
                <Input value={val} onChange={(v) => editAt(i, v)}></Input>{i > 0 || canDeleteFirst ? remove : null}
                </InputGroup>
            </div>
        })
    }

    return (
        <div onBlur={() => onChange(list)}>
            {renderValues()}
            {!editTextOnly && <Button onClick={add}><PlusIcon/></Button>}
        </div>
    );
};

export default StringListEditor;
