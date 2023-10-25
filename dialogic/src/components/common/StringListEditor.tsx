import MinusIcon from '@rsuite/icons/Minus';
import PlusIcon from '@rsuite/icons/Plus';
import React from 'react';
import { Button, Input } from 'rsuite';
import './StringListEditor.css';

interface StringListEditorProps {
    onChange: (update: string[]) => void;
    value: string[]
    canBeEmpty?: boolean
}

const StringListEditor: React.FC<StringListEditorProps> = ({onChange, value, canBeEmpty }) => {
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
            const remove = <Button onClick={() => removeAt(i)}><MinusIcon/></Button>
            return <div key={i} className="string-list-editor-row">
                <Input value={val} onChange={(v) => editAt(i, v)}></Input>{i > 0 || canDeleteFirst ? remove : null}
            </div>
        })
    }

    return (
        <div onBlur={() => onChange(list)}>
            {renderValues()}
            <Button onClick={add}><PlusIcon/></Button>
        </div>
    );
};

export default StringListEditor;
