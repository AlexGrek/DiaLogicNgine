import React, { useState } from 'react';
import { TextList } from '../../../game/TextList';
import { Button, Input, InputGroup, Nav, Stack } from 'rsuite';
import HomeIcon from '@rsuite/icons/legacy/Home';
import TrashIcon from '@rsuite/icons/Trash';
import lodash from 'lodash';

interface TextListEditorProps {
    textList: TextList;
    onChange: (t: TextList) => void;
    singleLine?: boolean;
}

const TextListEditor: React.FC<TextListEditorProps> = ({ textList, onChange, singleLine }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);

    const CREATE_INDEX = -100500

    const onTextChange = (text: string) => {
        const copy = lodash.cloneDeep(textList)
        if (editingIndex < 0) {
            copy.main = text
        }
        else {
            copy.list[editingIndex].text = text
        }
        onChange(copy)
    }

    const onNameChange = (n: string) => {
        const copy = lodash.cloneDeep(textList)
        if (editingIndex < 0) {
            console.warn("name changed while on unnamed tab")
        }
        else {
            copy.list[editingIndex].name = n == "" ? undefined : n 
        }
        onChange(copy)
    }

    const onRemoveTab = () => {
        const copy = lodash.cloneDeep(textList)
        if (editingIndex < 0) {
            console.warn("remove while on unnamed tab")
        }
        else {
            copy.list.splice(editingIndex, 1)
            setEditingIndex(editingIndex - 1)
        }
        onChange(copy)
    }

    const onSelect = (selected: string) => {
        const selected_int = parseInt(selected)
        if (selected_int === CREATE_INDEX) {
            // create
            const new_index = textList.list.length
            const updatedList = [...textList.list, {text: ""}]
            setEditingIndex(new_index)
            onChange({...textList, list: updatedList})
        }
        else {
            setEditingIndex(selected_int)
        }
    }

    const navItems = textList.list.map((el, i) => {
        const key = `${i}`
        const name = el.name ? el.name : key
        return <Nav.Item eventKey={key} key={key}> {name}
        </Nav.Item>
    })

    const editingText = editingIndex >= 0 && editingIndex < textList.list.length ? textList.list[editingIndex].text : textList.main
    const editingName = editingIndex >= 0 && editingIndex < textList.list.length ? textList.list[editingIndex].name : undefined

    const nameEditingPanel = (name?: string) => {
        const viewName = name ? name : ""
        return (
            <InputGroup className='text-list-tab-controls'>
            <InputGroup.Addon>Name</InputGroup.Addon>
            <Input className='text-list-tab-name' value={viewName} onChange={onNameChange} size="sm" style={{width: "42em"}}></Input>
            <InputGroup.Button onClick={onRemoveTab}>
            <TrashIcon/>
            </InputGroup.Button>
            </InputGroup>)
    }

    const editor = 
        <Input className='text-list-text-editor' as="textarea" value={editingText} onChange={onTextChange} rows={singleLine ? 1 : 5}></Input>

    return (
        <div>
        <Nav className='text-list-tabs' activeKey={editingIndex.toString()} onSelect={onSelect} appearance="subtle" reversed style={{ marginBottom: 2 }}>
            <Nav.Item className='text-list-tab-main' eventKey={"-1"} icon={<HomeIcon />}>
                main
            </Nav.Item>
            {navItems}
            <Nav.Item className='text-list-tab-plus' eventKey={CREATE_INDEX.toString()}>+</Nav.Item>
        </Nav>
        <div>
            {editingIndex < 0 ? null : nameEditingPanel(editingName) }
            {editor}
        </div>
        </div>
    );
};

export default TextListEditor;
