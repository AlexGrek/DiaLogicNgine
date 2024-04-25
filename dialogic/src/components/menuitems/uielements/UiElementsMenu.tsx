import lodash, { isNumber, isString } from 'lodash';
import React, { useState } from 'react';
import { Button, Divider, Drawer, Input, InputNumber, Stack, Toggle } from 'rsuite';
import { GameDescription } from '../../../game/GameDescription';
import ConfirmDeleteButton from '../../common/ConfirmDeleteButton';
import './UiElementsMenu.css';
import CreateWithUid, { CreationData } from '../../common/CreateWithUid';
import GameUiElementDescr, { GameUiElementMeter, MeterProgressBar, initGameUiElementMeter, initMeterProgressBar } from '../../../game/GameUiElementDescr';
import PopupCodeEditor, { DEFAULT_ARGS, PopupCodeEditorUi } from '../../common/code_editor/PopupCodeEditor';
import CodeSampleButton from '../../common/CodeSampleButton';
import MeterProgressBarEditor from './MeterProgressBarEditor';

const CODE_EDITOR_UI: PopupCodeEditorUi = {
    arguments: DEFAULT_ARGS,
    "functionName": "runUICode",
    "functionTemplates": {
        "no action": "",
        "always no": "return false;",
        "testNumProp": "return props.testNumProp;"
    },
    "header": "alternative choose"
}

interface UiElementsMenuProps {
    game: GameDescription;
    ui: GameUiElementDescr
    onSetUi: (items: GameUiElementDescr) => void
    visible: boolean
}

type CodeEditMenu = "visibleIf" | "value"

const UiElementsMenu: React.FC<UiElementsMenuProps> = ({ game, ui, onSetUi, visible }) => {
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [editingObject, setEditingMeter] = useState<GameUiElementMeter | null>(null);
    // enable code editor props
    const [codeEditMenu, setCodeEditMenu] = useState<CodeEditMenu>("visibleIf");
    const [codeEditorOpen, setCodeEditorOpen] = useState<boolean>(false);

    if (!visible) {
        return <div />
    }

    const setEditing = (index: number, object?: GameUiElementMeter) => {
        setEditingIndex(index)
        if (object !== undefined) {
            setEditingMeter(object)
            return;
        }
        if (index >= ui.meters.length || index < 0) {
            return;
        }
        setEditingMeter(ui.meters[index])
    }

    const createItem = (data: CreationData) => {
        const item = initGameUiElementMeter(data.name, data.uid)
        item.name = data.name
        setEditing(ui.meters.length, item)
        onSetUi({ ...ui, meters: [...ui.meters, item] })
    }

    const deleteItemMeter = (index: number) => {
        setEditing(-1)
        const itemsUpd = lodash.cloneDeep(ui.meters)
        itemsUpd.splice(index, 1)
        onSetUi({ ...ui, meters: itemsUpd })
    }

    const renderDrawerContents = () => {
        if (ui.meters.length < editingIndex || editingObject === null) {
            return <div>Wrong meter selected: {ui.meters.length}, {editingIndex}</div>
        }
        const it = editingObject
        const updateItem = (prop: "name" | "description", value: string) => {
            setEditingMeter({ ...editingObject, [prop]: value })
        }

        const updateProgressBar = (v: MeterProgressBar) => {
            setEditingMeter({ ...editingObject, progressBar: v })
        }

        const editCode = (menu: CodeEditMenu, val: string) => {
            const upd = val.trim() === "" ? undefined : val;
            setEditingMeter({ ...editingObject, [menu]: upd })
            setCodeEditorOpen(false)
        }

        const setOpacity = (value: string | number | null) => {
            let updVal = 0;
            if (isString(value)) {
                updVal = parseFloat(value)
            }
            if (value === null) {
                updVal = 0;
            }
            if (isNumber(value)) {
                updVal = value;
            }
            setEditingMeter({ ...editingObject, layout: { ...editingObject.layout, opacity: updVal } })
        }

        const renderCodeEditor = (menu: CodeEditMenu) => {
            const code = editingObject[menu]
            return <PopupCodeEditor game={game} ui={CODE_EDITOR_UI} code={code || ""} onSaveClose={(s) => editCode(menu, s)} open={codeEditorOpen}/>
        }

        const renderCodeEditButton = (prop: CodeEditMenu, name?: string) => {
            const displayName = name || prop
            const codeEdit = (menu: CodeEditMenu) => {
                setCodeEditMenu(menu)
                setCodeEditorOpen(true)
            }
            return <CodeSampleButton onClick={() => codeEdit(prop)} name={displayName} code={editingObject[prop]} />
        }

        return <div className='items-drawer-contents'>
            {renderCodeEditor(codeEditMenu)}
            <Input value={it.name} onChange={(val) => updateItem("name", val)} placeholder='display meter name'></Input>
            <h3>Layout</h3>
            <InputNumber step={0.1} value={it.layout.opacity} onChange={(val) => setOpacity(val)} placeholder='meter opacity'></InputNumber>
            <h3>Behavior</h3>
            {renderCodeEditButton("value")}
            {renderCodeEditButton("visibleIf")}
            <Divider />
            <h3>Progress</h3>
            <Toggle size="lg" onChange={(val) => {
                if (val) {
                    setEditingMeter({...editingObject, progressBar: initMeterProgressBar()})
                } else {
                    setEditingMeter({...editingObject, progressBar: null})
                }
            }} checkedChildren="Progress bar" checked={editingObject.progressBar != null}/>
            {editingObject.progressBar != null && <MeterProgressBarEditor progressBar={editingObject.progressBar} onChange={updateProgressBar}/> }
            <Divider />
            <p className='item-edit-uid'><b/>Meter UID: <b>{it.uid}</b></p>
        </div>
    }

    const renderItems = () => {
        return ui.meters.map((it, i) => {
            return <div className='item-item' key={i} onClick={() => setEditing(i)}>
                <div className='item-header'><p className='item-uid'>{it.uid}</p></div>
                <p className='item-name'>{it.value ? it.value.replace("return", "").trim() : ""}</p>
                <p className='item-name'>{it.name}</p>
            </div>
        })
    }

    const saveEdited = () => {
        // save updates into index
        const copied = lodash.cloneDeep(ui.meters)
        if (editingObject !== null)
            copied[editingIndex] = editingObject
        setEditing(-1)
        onSetUi({ ...ui, meters: copied })
    }

    return (
        <div className='ui-items-main'>
            <div className='ui-meters'>
                <h2>Meters</h2>
                <div className='ui-items-create-panel'>
                    <CreateWithUid objectName={'meter'} onCreate={createItem} />
                </div>
                <Stack wrap className='ui-items-container'>
                    {renderItems()}
                </Stack>
                <Drawer placement='right' open={editingIndex >= 0 && editingIndex < ui.meters.length} onClose={() => saveEdited()}>
                    <Drawer.Header>
                        <Drawer.Title>Edit meter</Drawer.Title>
                        <Drawer.Actions>
                            <ConfirmDeleteButton onConfirm={() => deleteItemMeter(editingIndex)} objectDescr={`meter`}></ConfirmDeleteButton>
                            <Button onClick={() => saveEdited()} appearance="primary">
                                Save
                            </Button>
                        </Drawer.Actions>
                    </Drawer.Header>
                    <Drawer.Body>
                        {editingIndex >= 0 && editingIndex < ui.meters.length ? renderDrawerContents() : null}
                    </Drawer.Body>
                </Drawer>
            </div>
        </div>
    );
};

export default UiElementsMenu;
