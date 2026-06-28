import React, { useState } from 'react';
import { IUpds } from '../../App';
import { Button, Checkbox, Divider, Input, InputPicker, Message, Modal } from 'rsuite';
import CreableIcon from '@rsuite/icons/Creative';
import PlusRoundIcon from '@rsuite/icons/PlusRound';
import Dialog, { createActor, createDialog, createWindow } from '../../game/Dialog';

interface QuickWindowCreatorProps {
    dialogs: Dialog[];
    onCreated: (dialog: string, window: string) => void
    handlers: IUpds
}

const QuickWindowCreator: React.FC<QuickWindowCreatorProps> = ({ dialogs, onCreated, handlers }) => {
    const [editWindowOpen, setEditWindowOpen] = useState<boolean>(false)
    const [dialogName, setDialogName] = useState<string | null>(null)
    const [windowName, setWindowName] = useState<string>("")
    const [windowText, setWindowText] = useState<string>("")
    const [currentActor, setCurrentActor] = useState<boolean>(false)

    const handleOpen = () => setEditWindowOpen(true);
    const handleClose = () => setEditWindowOpen(false);

    const dialogExists = dialogName != null && dialogs.some(d => d.name === dialogName)
    const isNewDialog = dialogName != null && dialogName !== '' && !dialogExists

    const handleCreate = () => {
        if (dialogName === null || dialogName === '') {
            handlers.notify("error", "No dialog selected, cannot create window")
            return
        }

        if (windowName === '') {
            handlers.notify("error", "No window name, cannot create window")
            return
        }

        handleClose()

        const window = createWindow(windowName)
        window.text.main = windowText
        if (currentActor) {
            window.actor = createActor()
            window.actor.currentCharacter = true
        }

        handlers.handleDialogWindowChange(window, dialogName, true)
        handlers.notify('success', `Window ${dialogName}.${windowName} created`)

        setWindowName('')
        setWindowText('')
        // leave other values unchanged

        onCreated(dialogName, windowName)
    }

    const createQuickDialog = (name: string) => {
        handlers.handleDialogCreate(createDialog(name))
        setDialogName(name)
        handlers.notify("success", `Dialog ${name} created`)
    }

    const renderBody = () => {
        const dialogData = dialogs.map(dialog => { return { label: dialog.name, value: dialog.name } })
        return <div>
            <Divider>Dialog</Divider>
            <InputPicker
                block
                creatable
                data={dialogData}
                value={dialogName}
                onChange={setDialogName}
                onCreate={createQuickDialog}
                placeholder="Select existing or type a new dialog name…" />
            {isNewDialog &&
                <Message showIcon type="info" style={{ marginTop: 8 }}>
                    A new dialog <b>{dialogName}</b> will be created.
                </Message>}
            <Divider>Window</Divider>
            <Input name="windowName" onChange={setWindowName} value={windowName} placeholder='New window name' />
            <Input name="windowText" onChange={setWindowText} value={windowText} placeholder='New window text' as='textarea' />
            <Checkbox name="currentActor" checked={currentActor} onChange={(_val, ch) => setCurrentActor(ch)}>Actor: current</Checkbox>
        </div>
    }

    return (
        <span><Button onClick={handleOpen} appearance='ghost' startIcon={<PlusRoundIcon />}>
            New dialog/window
        </Button>
            <Modal open={editWindowOpen} onClose={handleClose}>
                <Modal.Header>
                    <Modal.Title><CreableIcon style={{ marginRight: 8 }} />Create dialog/window</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {editWindowOpen && renderBody()}
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={handleCreate} appearance="primary">
                        Create
                    </Button>
                    <Button onClick={handleClose} appearance="subtle" color='red'>
                        Cancel
                    </Button>
                </Modal.Footer>
            </Modal>
        </span>
    );
};

export default QuickWindowCreator;
