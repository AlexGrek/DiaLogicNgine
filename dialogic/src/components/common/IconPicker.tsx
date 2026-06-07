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
    /** When true, icon is optional — shows inherit default and a Clear button. */
    optional?: boolean;
    onClear?: () => void;
}

const IconPicker: React.FC<IconPickerProps> = ({
    value,
    onChange,
    children,
    optional = false,
    onClear,
}) => {
    const [modalOpen, setModalOpen] = useState(false);
    const hasValue = Boolean(value);
    const label = hasValue && value
        ? (findIconDef(value)?.def.label ?? value)
        : 'No icon';

    return (
        <div className="picker-container" data-testid="icon-picker">
            {children && <div className="picker-header">{children}</div>}
            <div className="picker-select-row">
                <span className="picker-value-label" title={label}>{label}</span>
                <Button size="sm" onClick={() => setModalOpen(true)}>Browse…</Button>
                {optional && hasValue && onClear && (
                    <Button size="sm" appearance="subtle" onClick={onClear}>Clear</Button>
                )}
            </div>
            {hasValue && value && (
                <div className="picker-preview-icon">
                    <IconSvg iconId={value} size={40} />
                </div>
            )}
            <IconPickerModal
                open={modalOpen}
                currentIconId={value ?? ''}
                onSelect={onChange}
                onClose={() => setModalOpen(false)}
            />
        </div>
    );
};

export default IconPicker;
