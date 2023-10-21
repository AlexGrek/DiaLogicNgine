import React from 'react';
import { IconButton } from 'rsuite';
import TrashIcon from '@rsuite/icons/Trash';
import ShieldIcon from '@rsuite/icons/Shield';

interface ConfirmDeleteButtonSmallProps {
    onConfirm: () => void
}

const ConfirmDeleteButtonSmall: React.FC<ConfirmDeleteButtonSmallProps> = ({ onConfirm }) => {
    const [pressed, setPressed] = React.useState<boolean>(false)

    return (
        <span>
        {!pressed ? 
            <IconButton color="red" onClick={() => setPressed(true)} icon={<TrashIcon/>}>Delete</IconButton> 
            : <IconButton color="red" onClick={() => onConfirm()} icon={<ShieldIcon/>}>Confirm</IconButton>}
        </span>
    );
};

export default ConfirmDeleteButtonSmall;
