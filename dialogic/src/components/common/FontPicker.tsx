import React, { ReactNode, useState } from 'react';
import { Button } from 'rsuite';
import {
    DEFAULT_FONT_ID,
    FONT_CSS,
    FONT_OPTIONS,
    type FontId,
} from '../../lib/fonts';
import FontPickerModal from './FontPickerModal';
import './Pickers.css';

interface FontPickerProps {
    value?: FontId;
    onChange: (fontId: FontId) => void;
    children?: ReactNode;
    /** When true, font is optional — shows inherit default and a Clear button. */
    optional?: boolean;
    onClear?: () => void;
}

function getFontLabel(fontId: FontId): string {
    return FONT_OPTIONS.find((f) => f.id === fontId)?.label ?? fontId;
}

const FontPicker: React.FC<FontPickerProps> = ({
    value,
    onChange,
    children,
    optional = false,
    onClear,
}) => {
    const [modalOpen, setModalOpen] = useState(false);
    const hasValue = value !== undefined;
    const css = hasValue ? (FONT_CSS[value] ?? FONT_CSS[DEFAULT_FONT_ID]) : undefined;
    const label = hasValue ? getFontLabel(value) : 'Default (inherit)';

    return (
        <div className="picker-container" data-testid="font-picker">
            {children && <div className="picker-header">{children}</div>}
            <div className="picker-select-row">
                <span className="picker-value-label" title={label}>{label}</span>
                <Button size="sm" onClick={() => setModalOpen(true)}>Browse…</Button>
                {optional && hasValue && onClear && (
                    <Button size="sm" appearance="subtle" onClick={onClear}>Clear</Button>
                )}
            </div>
            {css && (
                <div className="picker-preview-font" style={{ fontFamily: css }}>
                    The quick brown fox jumps over the lazy dog.
                </div>
            )}
            <FontPickerModal
                open={modalOpen}
                currentFontId={value ?? DEFAULT_FONT_ID}
                onSelect={onChange}
                onClose={() => setModalOpen(false)}
            />
        </div>
    );
};

export default FontPicker;
