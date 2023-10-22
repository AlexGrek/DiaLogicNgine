import React, { useState, useEffect } from 'react';
import { GameDescription } from '../../../game/GameDescription';
import { Button, Checkbox, Divider, Drawer, Dropdown, Input, InputGroup } from 'rsuite';
import { isValidJsIdentifier } from '../../../Utils';
import { Item, createEmptyItem } from '../../../game/Items';
import PlusIcon from '@rsuite/icons/Plus';
import lodash from 'lodash';
import ConfirmDeleteButton from '../../common/ConfirmDeleteButton';
import StringListEditor from '../../common/StringListEditor';

interface ItemsMenuProps {
    game: GameDescription;
    items: Item[]
    onSetItems: (items: Item[]) => void
}

const ItemsMenu: React.FC<ItemsMenuProps> = ({ game, items, onSetItems }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [newUid, setNewUid] = React.useState<string>("")

    const createItem = () => {
        if (!isValidJsIdentifier(newUid)) {
            return
        }
        const item = createEmptyItem(newUid)
        setNewUid("")
        setEditingIndex(items.length)
        onSetItems([...items, item])
    }

    const deleteItem = (index: number) => {
        setEditingIndex(-1)
        const itemsUpd = lodash.cloneDeep(items)
        itemsUpd.splice(index, 1)
        onSetItems(itemsUpd)
    }

    const renderDrawerContents = () => {
        if (items.length < editingIndex) {
            return <div>Wrong item selected: {items.length}, {editingIndex}</div>
        }
        const it = items[editingIndex]
        const updateItem = (prop: "name" | "description", value: string) => {
            const upd = lodash.cloneDeep(items)
            upd[editingIndex][prop] = value
            onSetItems(upd)
        }

        const setTags = (value: string[]) => {
            const upd = lodash.cloneDeep(items)
            upd[editingIndex].tags = value
            onSetItems(upd)
        }

        const setCheck= (prop: "canGive" | "unique", value: boolean) => {
            const upd = lodash.cloneDeep(items)
            upd[editingIndex][prop] = value
            onSetItems(upd)
        }

        return <div className='facts-drawer-contents'>
            <Input value={it.name} onChange={(val) => updateItem("name", val)} placeholder='display item name'></Input>
            <Input value={it.description} onChange={(val) => updateItem("description", val)} as="textarea" rows={5} placeholder='item description'></Input>
            <Divider>Tags</Divider>
            <StringListEditor canBeEmpty={true} value={it.tags} onChange={setTags}></StringListEditor>
            <Divider>Properties</Divider>
            <Checkbox checked={it.unique} onChange={(value, checked) => setCheck("unique", checked)}>Unique</Checkbox>
            <Checkbox checked={it.canGive} onChange={(value, checked) => setCheck("canGive", checked)}>Can give to NPC</Checkbox>
            <p className='item-edit-uid'>Item UID: <b>{it.uid}</b></p>
        </div>
    }

    const renderItems = () => {
        return items.map((fact, i) => {
            return <div className='item-item' key={i} onClick={() => setEditingIndex(i)}>
                <div className='item-header'><p className='fact-uid'>{fact.uid}</p></div>
                <p className='item-name'>{fact.name}</p>
            </div>
        })
    }

    return (
        <div>
            <div className='facts-create-panel'>
                <Dropdown title="Create">
                    <Dropdown.Item panel style={{ padding: 10, width: 280 }}>
                        <InputGroup>
                            <InputGroup.Addon>UID:</InputGroup.Addon><Input onPressEnter={() => createItem()} value={newUid} onChange={setNewUid}></Input>
                            <InputGroup.Button onClick={() => createItem()} disabled={!isValidJsIdentifier(newUid)}><PlusIcon /></InputGroup.Button>
                        </InputGroup>
                    </Dropdown.Item>
                </Dropdown>
            </div>
            <div className='facts-container'>
                {renderItems()}
            </div>
            <Drawer placement='right' open={editingIndex >= 0 && editingIndex < items.length} onClose={() => setEditingIndex(-1)}>
        <Drawer.Header>
          <Drawer.Title>Edit item</Drawer.Title>
          <Drawer.Actions>
          <ConfirmDeleteButton onConfirm={() => deleteItem(editingIndex)} objectDescr={`item`}></ConfirmDeleteButton>
            <Button onClick={() => setEditingIndex(-1)} appearance="primary">
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
