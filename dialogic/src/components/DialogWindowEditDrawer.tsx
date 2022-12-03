import React, { useState, useEffect } from 'react';
import Dialog from '../game/Dialog';

interface DialogWindowEditDrawerProps {
    dialog: Dialog;
}

const DialogWindowEditDrawer: React.FC<DialogWindowEditDrawerProps> = ({ dialog }) => {
    const [dialogState, setDialog] = useState<Dialog>(dialog);
    useEffect(() => {
        setDialog(dialog);
    }, [dialog]);

    return (
        <>
            
        </>
    );
};

export default DialogWindowEditDrawer;
