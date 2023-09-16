import React, { useState } from 'react';
import { ImageList } from '../../../game/ImageList';
import { Button, Input, InputGroup, Nav, Stack } from 'rsuite';
import HomeIcon from '@rsuite/icons/legacy/Home';
import TrashIcon from '@rsuite/icons/Trash';
import lodash from 'lodash';
import PublicFileUrl, { IMAGES } from '../PublicFileUrl';

interface ImageListEditorProps {
    textList: ImageList;
    onChange: (t: ImageList) => void;
}

const ImageListEditor: React.FC<ImageListEditorProps> = ({ textList, onChange }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);

    const CREATE_INDEX = -100500

    const onTextChange = (text: string | undefined) => {
        const copy = lodash.cloneDeep(textList)
        if (editingIndex < 0) {
            copy.main = text
        }
        else {
            copy.list[editingIndex].uri = text
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
            const updatedList = [...textList.list, {uri: ""}]
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
        return <Nav.Item eventKey={key}> {name}
        </Nav.Item>
    })

    const editingText = editingIndex >= 0 && editingIndex < textList.list.length ? textList.list[editingIndex].uri : textList.main
    const editingName = editingIndex >= 0 && editingIndex < textList.list.length ? textList.list[editingIndex].name : undefined

    const nameEditingPanel = (name?: string) => {
        const viewName = name ? name : ""
        return (
            <InputGroup>
            <InputGroup.Addon>Name</InputGroup.Addon>
            <Input value={viewName} onChange={onNameChange} size="sm" style={{width: "42em"}}></Input>
            <InputGroup.Button onClick={onRemoveTab}>
            <TrashIcon/>
            </InputGroup.Button>
            </InputGroup>)
    }

    const editor =
        <PublicFileUrl extensions={IMAGES} value={editingText === "" ? undefined : editingText } onChange={onTextChange}/>

    const displayImage = (uri: string) => {
        return <div>
            <img alt="background image preview" height="128" src={`game_assets/${uri}`}/>
        </div>
    }

    return (
        <div>
        <Nav activeKey={editingIndex.toString()} onSelect={onSelect} appearance="subtle" reversed style={{ marginBottom: 2 }}>
            <Nav.Item eventKey={"-1"} icon={<HomeIcon />}>
                main
            </Nav.Item>
            {navItems}
            <Nav.Item eventKey={CREATE_INDEX.toString()}>+</Nav.Item>
        </Nav>
        <div>
            {editingIndex < 0 ? null : nameEditingPanel(editingName) }
            {editor}
            {editingText && editingText !== "" ? displayImage(editingText) : null}
        </div>
        </div>
    );
};

export default ImageListEditor;
