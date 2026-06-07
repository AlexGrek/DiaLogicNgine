import lodash from 'lodash';
import React, { useState } from 'react';
import { Button, Panel, Stack } from 'rsuite';
import { GameDescription } from '../../../game/GameDescription';
import ConfirmDeleteButton from '../../common/ConfirmDeleteButton';
import './PointAndClick.css';
import CreateWithUid, { CreationData } from '../../common/CreateWithUid';
import { createEmptyPac, PointAndClick } from '../../../game/PointAndClick';
import PointAndClickEditor from './PointAndClickEditor';
import { generateImageUrl } from '../../../Utils';
import { resolveImageProject } from '../../common/projectImages';
import { useProjectImages } from '../../common/ProjectImagesContext';

interface PacMenuProps {
    game: GameDescription;
    items: PointAndClick[]
    onSetItems: (items: PointAndClick[]) => void
}

const PointAncClick: React.FC<PacMenuProps> = ({ items, onSetItems }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [editingObject, setEditingObject] = useState<PointAndClick | null>(null);
    const storageProject = resolveImageProject(useProjectImages());

    const setEditingByIndex = (index: number) => {
        if (index >= items.length || index < 0) {
            return;
        }
        setEditingIndex(index)
        setEditingObject(items[index] || null)
    }

    const setEditing = (index: number, object: PointAndClick | null) => {
        setEditingIndex(index)
        if (object !== null) {
            setEditingObject(object)
            return;
        }
        if (index >= items.length || index < 0) {
            return;
        }
        setEditingObject(items[index] || null)
    }

    const createItem = (data: CreationData) => {
        const item = createEmptyPac(data.uid)
        setEditing(items.length, item)
        onSetItems([...items, item])
    }

    const deleteItem = (index: number) => {
        setEditing(-1, null);
        const itemsUpd = lodash.cloneDeep(items)
        itemsUpd.splice(index, 1)
        onSetItems(itemsUpd)
    }


    const renderItems = () => {
        return items.map((it, i) => {
            const thumbSrc = it.background?.trim()
                ? generateImageUrl(it.background, storageProject)
                : undefined
            return <div className='item-item' key={i} onClick={() => setEditingByIndex(i)}>
                {thumbSrc
                    ? <img className='item-thumb' alt="" src={thumbSrc} />
                    : <div className='item-name' style={{ color: '#faad14', fontSize: '11px', padding: '8px' }}>No background</div>}
                <div className='item-header'><p className='item-uid'>{it.id}</p></div>
            </div>
        })
    }

    const saveEdited = () => {
        if (!editingObject?.background?.trim()) {
            alert('Point-and-click scenes require a background image.');
            return;
        }
        // save updates into index
        const copied = lodash.cloneDeep(items)
        if (editingObject !== null)
            copied[editingIndex] = editingObject
        setEditingByIndex(-1)
        onSetItems(copied)
    }

    const canSave = Boolean(editingObject?.background?.trim())

    return (
        <div>
            <div className='items-create-panel'>
                <CreateWithUid objectName={'item'} onCreate={createItem} uidPrefix='pac::' />
            </div>
            <Stack wrap className='items-container'>
                {renderItems()}
            </Stack>
            {editingObject && (editingIndex >= 0 && editingIndex < items.length) && <Panel shaded>
                <div>
                    <h2>Edit item</h2>
                    <div>
                        <ConfirmDeleteButton onConfirm={() => deleteItem(editingIndex)} objectDescr={`item`}></ConfirmDeleteButton>
                        <Button onClick={() => saveEdited()} appearance="primary" disabled={!canSave}>
                            Save
                        </Button>
                    </div>
                </div>
                <div>
                    <PointAndClickEditor
                        value={editingObject}
                        onChange={setEditingObject}
                    />
                </div>
            </Panel>}
        </div>
    );
};

export default PointAncClick;
