import React from 'react';
import { Dropdown } from 'rsuite';
import TrashIcon from '@rsuite/icons/Trash';
import ShieldIcon from '@rsuite/icons/Shield';

interface MagicProps {
    objectDescr: string;
    onConfirm: () => void
}

const Magic: React.FC<MagicProps> = ({ objectDescr, onConfirm }) => {
    return (
        <Dropdown title="Magic" icon={<TrashIcon />}>
            <Dropdown.Item panel style={{ padding: 10, width: 160 }}>
                <p>Confirm to delete object</p>
                <strong>{objectDescr}</strong>
            </Dropdown.Item>
            <Dropdown.Separator />
            <Dropdown.Item icon={<ShieldIcon />} onSelect={() => onConfirm()}>Delete</Dropdown.Item>
        </Dropdown>
    );
};

export default Magic;
