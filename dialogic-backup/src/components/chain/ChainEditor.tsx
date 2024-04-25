import React, { useState, useEffect } from 'react';
import { Button, Divider, Drawer, IconButton, Input, Panel } from 'rsuite';
import Dialog, { Actor, DialogWindow, createDialogLink, createWindow } from '../../game/Dialog';
import PlusIcon from '@rsuite/icons/Plus';
import lodash from 'lodash';
import "./chain.css"
import { GameDescription } from '../../game/GameDescription';
import ActorEditor from '../common/actor/ActorEditor';
import { isValidJsIdentifier } from '../../Utils';

interface DialogStub {
    text: string;
    nextButton: string;
}

interface ChainEditorProps {
    dialogName?: string;
    visible: boolean;
    onSetVisible: (visible: boolean) => void;
    onApply: (create: DialogWindow[]) => void;
    dialog: Dialog;
    game: GameDescription
}

const ChainEditor: React.FC<ChainEditorProps> = ({ visible, onSetVisible, onApply, dialog, game }) => {
    const createNewStub = () => { return { text: "", nextButton: "..." } }

    const [uid, setUid] = useState<string>("")
    const [stubs, setStubs] = useState<DialogStub[]>([createNewStub()]);
    const [act, setAct] = useState<Actor | undefined>(undefined)

    const editStub = (i: number, stub: DialogStub) => {
        const stubsCopy = lodash.cloneDeep(stubs)
        stubsCopy[i] = stub
        setStubs(stubsCopy)
    }

    const genUid = (id: number, main: null | string = null): string => {
        const uidBase = main === null ? uid : main
        const identifier = id == 0 ? uidBase : `${uidBase}_${id}`
        const existing = dialog.windows.findIndex((d) => d.uid === identifier)
        if (existing < 0) {
            return identifier
        } else {
            return genUid(id, `${identifier}_0`)
        }
    }

    const del = (i: number) => {
        const stubsCopy = lodash.cloneDeep(stubs)
        stubsCopy.splice(i, 1)
        setStubs(stubsCopy)
    }

    const renderStubs = () => {
        return stubs.map((stub, i) => {
            const possibleUid = genUid(i)
            return <Panel bordered key={i}>
                <div className='chain-item-toolbar'><p className='chain-item-uid'>{possibleUid}</p><Button appearance="link" color="red" onClick={() => del(i)}>Delete</Button></div>
                <Input value={stub.text} placeholder='Text' as="textarea" rows={3} onChange={(val) => editStub(i, { ...stub, text: val })} />
                {i < stubs.length - 1 ?
                    <Input value={stub.nextButton} placeholder='Next button text' onChange={(val) => editStub(i, { ...stub, nextButton: val })} /> : null}
            </Panel>
        })
    }

    const apply = () => {
        const generated = stubs.map((stub, i) => {
            const uid = genUid(i)
            const dialogWindow = createWindow(uid)
            dialogWindow.text.main = stub.text
            dialogWindow.actor = act

            if (i < stubs.length - 1) {
                // add link to next
                const link = createDialogLink()
                link.text = stub.nextButton
                link.mainDirection.direction = genUid(i + 1)

                dialogWindow.links = [
                    link
                ]
            }

            return dialogWindow
        })
        onApply(generated)
        onSetVisible(false)
        setStubs([createNewStub()])
        setUid("")
    }

    const add = () => {
        const stubsCopy = lodash.cloneDeep(stubs)
        stubsCopy.push(createNewStub())
        setStubs(stubsCopy)
    }

    return (
        <Drawer placement="right" open={visible} onClose={() => onSetVisible(false)}>
            <Drawer.Header>
                <Drawer.Title>Window chain generator</Drawer.Title>
                <Drawer.Actions>
                    <Button onClick={() => {
                        setStubs([createNewStub()])
                        onSetVisible(false)
                        setAct(undefined)
                    }}>Reset</Button>
                    <Button onClick={() => apply()} appearance="primary" disabled={!isValidJsIdentifier(uid)}>
                        Generate
                    </Button>
                </Drawer.Actions>
            </Drawer.Header>
            <Drawer.Body>
                {visible &&
                    <div>
                        <Input value={uid} placeholder='Dialog window UID' onChange={setUid} />
                        <Divider>Actor</Divider>
                        <ActorEditor value={act ? act : null} game={game} onChange={(actor) => setAct(actor)} />
                        <Divider>Windows</Divider>
                        <div className="chain-container">
                            {renderStubs()}
                        </div>
                        <div className='chain-toolbox-bottom'>
                            <IconButton icon={<PlusIcon />} onClick={() => add()}>Add</IconButton>
                        </div>
                    </div>}
            </Drawer.Body>
        </Drawer>

    );
};

export default ChainEditor;
