import React, { useState, useEffect } from 'react';
import { Button, Input, Modal } from 'rsuite';

interface ConfirmationDialogProps {
    text_prompt: string,
    text_initial: string,
    header: string,
    onConfirm: (changedText: string) => void,
    onClose: Function,
    validator: (newText: string) => boolean,
    placeholder?: string
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({validator, text_initial, text_prompt, header, placeholder, onConfirm, onClose }) => {
    const [open, setOpen] = useState<boolean>(true);
    const [text, setText] = useState<string>("");
    const [valid, setValid] = useState<boolean>(true);

    useEffect(() => {
        setOpen(true);
        setText(text_initial);
    }, [text_initial]);

    const handleCancel = (e: any) => {
        setOpen(false);
        onClose();
    }

    const handleConfirm = (e: any) => {
        setOpen(false);
        onConfirm(text);
    }

    const updateTextValue = (s: string) => {
        setText(s)
        setValid(validator(s))
    }

    return (
        <Modal backdrop={true} keyboard={true} open={open} onClose={handleCancel}>
            <Modal.Header>
                <Modal.Title>{header}</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <div>
                    <p>
                        {text_prompt}
                    </p>
                    <Input placeholder={placeholder} value={text} onChange={updateTextValue}></Input>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button onClick={handleConfirm} appearance="primary" disabled={!valid}>
                    Apply
                </Button>
                <Button onClick={handleCancel} appearance="subtle">
                    Cancel
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ConfirmationDialog;
