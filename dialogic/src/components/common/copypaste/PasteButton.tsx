import AttachmentIcon from '@rsuite/icons/Attachment';
import React, { useState } from 'react';
import { Dropdown, IconButton, Input, InputGroup } from 'rsuite';
import { IUpds } from '../../../App';
import { isValidJsIdentifier } from '../../../Utils';
import PlusIcon from '@rsuite/icons/Plus';

interface PasteButtonProps {
    handlers: IUpds
    customText?: string
    typenames: string[]
    onPasteClick: (obj: any, typename: string, newUid?: string) => void
    requireNewUid?: boolean
}

const PasteButton: React.FC<PasteButtonProps> = ({ handlers, customText, onPasteClick, typenames, requireNewUid }) => {
    const [pressed, setPressed] = React.useState<boolean>(false)
    const [creatingUID, setCreatingUID] = useState<string>("");

    const press = () => {
        if (requireNewUid) {
            if (!isValidJsIdentifier(creatingUID)) {
                console.error("Paste: invalid identifier " + creatingUID)
                return
            }
        }
        const pasted = handlers.paste()
        if (pasted !== undefined) {
            if (typenames.includes(pasted.typename)) {
                // great, we can paste!
                onPasteClick(pasted.value, pasted.typename, creatingUID)
                setCreatingUID("")
                return
            }
            // object in buffer is of unsupported type
            console.error(`Paste: unsupported object '${pasted.typename}'`)
            handlers.notify("error", `Paste: unsupported object '${pasted.typename}'`)
        } else {
            console.error(`Paste: buffer is empty`)
            handlers.notify("error", `Paste: buffer is empty`)
        }

        setPressed(true)
        setTimeout(() => {
            setPressed(false)
        }, 1000)
    }

    return requireNewUid ?
        (<Dropdown id='pastebutton' name='paste' title="Paste" icon={<AttachmentIcon />}>
            <Dropdown.Item panel style={{ padding: 10, width: 280 }}>
                <InputGroup>
                    <InputGroup.Addon>Copy UID:</InputGroup.Addon><Input onPressEnter={() => press()} value={creatingUID} onChange={setCreatingUID}></Input>
                    <InputGroup.Button onClick={() => press()} disabled={!isValidJsIdentifier(creatingUID) || pressed}><PlusIcon /></InputGroup.Button>
                </InputGroup>
            </Dropdown.Item>
        </Dropdown>) :
        (
            <IconButton id='pastebutton' name='paste' style={{ minWidth: "7em" }} disabled={pressed} color="red" onClick={() => press()} icon={<AttachmentIcon />}>{customText || "Paste"}</IconButton>
        );
};

export default PasteButton;
