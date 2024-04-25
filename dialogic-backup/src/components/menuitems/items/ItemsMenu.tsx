import PlusIcon from '@rsuite/icons/Plus';
import lodash from 'lodash';
import React, { useState } from 'react';
import { Button, Checkbox, Divider, Drawer, Dropdown, Input, InputGroup, Stack } from 'rsuite';
import { generateImageUrl, isValidJsIdentifier, mergeDicts } from '../../../Utils';
import { GameDescription } from '../../../game/GameDescription';
import { Item, createEmptyItem } from '../../../game/Items';
import ConfirmDeleteButton from '../../common/ConfirmDeleteButton';
import ImagePicker from '../../common/ImagePicker';
import StringListEditor from '../../common/StringListEditor';
import StringMapEditor from '../../common/StringMapEditor';
import './ItemsMenu.css';
import ItemsPicker from './ItemsPicker';
import CreateWithUid, { CreationData } from '../../common/CreateWithUid';

interface ItemsMenuProps {
    game: GameDescription;
    items: Item[]
    onSetItems: (items: Item[]) => void
    visible: boolean
}

const ItemsMenu: React.FC<ItemsMenuProps> = ({ game, items, onSetItems, visible }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [editingObject, setEditingObject] = useState<Item | null>(null);

    if (!visible) {
        return <div/>
    }

    const setEditing = (index: number, object?: Item) => {
        setEditingIndex(index)
        if (object !== undefined) {
            setEditingObject(object)
            return;
        }
        if (index >= items.length || index < 0) {
            return;
        }
        setEditingObject(items[index])
    }

    const createItem = (data: CreationData) => {
        const item = createEmptyItem(data.uid)
        item.name = data.name
        setEditing(items.length, item)
        onSetItems([...items, item])
    }

    const deleteItem = (index: number) => {
        setEditing(-1)
        const itemsUpd = lodash.cloneDeep(items)
        itemsUpd.splice(index, 1)
        onSetItems(itemsUpd)
    }

    const renderDrawerContents = () => {
        if (items.length < editingIndex || editingObject === null) {
            return <div>Wrong item selected: {items.length}, {editingIndex}</div>
        }
        const it = editingObject
        const updateItem = (prop: "name" | "description", value: string) => {
            setEditingObject({ ...editingObject, [prop]: value })
        }

        const setTags = (value: string[]) => {
            setEditingObject({ ...editingObject, tags: value })
        }

        const setCheck = (prop: "canGive" | "unique", value: boolean) => {
            setEditingObject({ ...editingObject, [prop]: value })
        }

        const setImage = (prop: "image" | "thumbnail", value: string | undefined) => {
            setEditingObject({ ...editingObject, [prop]: value })
        }

        const copyStats = (item: Item | null) => {
            if (!item) {
                return
            }
            const stats = item.stats
            setEditingObject({ ...it, stats: mergeDicts(it.stats, stats) })
        }

        const copyTags = (item: Item | null) => {
            if (!item) {
                return
            }
            const tags = item.tags
            setEditingObject({ ...it, tags: [...it.tags, ...tags] })
        }

        return <div className='items-drawer-contents'>
            <Input value={it.name} onChange={(val) => updateItem("name", val)} placeholder='display item name'></Input>
            <Input value={it.description} onChange={(val) => updateItem("description", val)} as="textarea" rows={5} placeholder='item description'></Input>
            <Divider>Images</Divider>
            <ImagePicker value={it.image} onChange={val => setImage("image", val || undefined)}>Image</ImagePicker>
            <ImagePicker value={it.thumbnail} onChange={val => setImage("thumbnail", val || undefined)}>Thumbnail</ImagePicker>
            <Divider>Properties</Divider>
            <Checkbox checked={it.unique} onChange={(value, checked) => setCheck("unique", checked)}>Unique</Checkbox>
            <Checkbox checked={it.canGive} onChange={(value, checked) => setCheck("canGive", checked)}>Can give to NPC</Checkbox>
            <Divider>Stats</Divider>
            <p><ItemsPicker placeholder='Copy stats from...' game={game} onPickItem={copyStats} excludeUids={[it.uid]}/></p>
            <StringMapEditor value={it.stats} onChange={value => setEditingObject({ ...editingObject, stats: value })}></StringMapEditor>
            <Divider>Tags</Divider>
            <p><ItemsPicker placeholder='Copy tags from...' game={game} onPickItem={copyTags} excludeUids={[it.uid]}/></p>
            <StringListEditor canBeEmpty={true} value={it.tags} onChange={setTags}></StringListEditor>
            <p className='item-edit-uid'>Item UID: <b>{it.uid}</b></p>
        </div>
    }

    const renderItems = () => {
        return items.map((it, i) => {
            const img = it.thumbnail ? it.thumbnail : it.image
            return <div className='item-item' key={i} onClick={() => setEditing(i)}>
                <div className='item-header'><p className='item-uid'>{it.uid}</p></div>
                {img ? <img className='item-thumb' src={generateImageUrl(img)} /> : null}
                <p className='item-name'>{it.name}</p>
            </div>
        })
    }

    const saveEdited = () => {
        // save updates into index
        const copied = lodash.cloneDeep(items)
        if (editingObject !== null)
            copied[editingIndex] = editingObject
        setEditing(-1)
        onSetItems(copied)
    }

    return (
        <div>
            <div className='items-create-panel'>
                <CreateWithUid objectName={'item'} onCreate={createItem}/>
            </div>
            <Stack wrap className='items-container'>
                {renderItems()}
            </Stack>
            <Drawer placement='right' open={editingIndex >= 0 && editingIndex < items.length} onClose={() => saveEdited()}>
                <Drawer.Header>
                    <Drawer.Title>Edit item</Drawer.Title>
                    <Drawer.Actions>
                        <ConfirmDeleteButton onConfirm={() => deleteItem(editingIndex)} objectDescr={`item`}></ConfirmDeleteButton>
                        <Button onClick={() => saveEdited()} appearance="primary">
                            Save
                        </Button>
                    </Drawer.Actions>
                </Drawer.Header>
                <Drawer.Body>
                    {editingIndex >= 0 && editingIndex < items.length ? renderDrawerContents() : null}
                </Drawer.Body>
            </Drawer>
        </div>
    );
};

export default ItemsMenu;
