import React, { useState, useEffect } from 'react';
import { Button, Modal } from 'rsuite';

interface ConfirmationDialogProps {
    text: string,
    header: string,
    onConfirm: () => void,
    onClose: () => void
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ text, header, onConfirm, onClose }) => {
    const [open, setOpen] = useState<boolean>(true);

    useEffect(() => {
        setOpen(true);
    }, []);

    const handleCancel = () => {
        setOpen(false);
        onClose();
    }

    const handleConfirm = () => {
        setOpen(false);
        onConfirm();
    }

    return (
        <Modal backdrop={true} keyboard={true} open={open} onClose={handleCancel}>
            <Modal.Header>
                <Modal.Title>{header}</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <div>
                    <p>
                        {text}
                    </p>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button onClick={handleConfirm} appearance="primary">
                    Ok
                </Button>
                <Button onClick={handleCancel} appearance="subtle">
                    Cancel
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ConfirmationDialog;
