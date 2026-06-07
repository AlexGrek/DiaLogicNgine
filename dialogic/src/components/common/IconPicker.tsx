import React, { ReactNode, useState } from 'react';
import { Button } from 'rsuite';
import { findIconDef } from '../../lib/icons';
import IconPickerModal from './IconPickerModal';
import IconSvg from './IconSvg';
import './Pickers.css';

interface IconPickerProps {
    value?: string;
    onChange: (iconId: string) => void;
    children?: ReactNode;
}

const IconPicker: React.FC<IconPickerProps> = ({
    value = '',
    onChange,
    children,
}) => {
    const [modalOpen, setModalOpen] = useState(false);
    const label = value ? (findIconDef(value)?.def.label ?? value) : 'No icon selected';

    return (
        <div className="picker-container" data-testid="icon-picker">
            {children && <div className="picker-header">{children}</div>}
            <div className="picker-select-row">
                <span className="picker-value-label" title={label}>{label}</span>
                <Button size="sm" onClick={() => setModalOpen(true)}>Browse…</Button>
            </div>
            {value && (
                <div className="picker-preview-icon">
                    <IconSvg iconId={value} size={40} />
                </div>
            )}
            <IconPickerModal
                open={modalOpen}
                currentIconId={value}
                onSelect={onChange}
                onClose={() => setModalOpen(false)}
            />
        </div>
    );
};

export default IconPicker;
