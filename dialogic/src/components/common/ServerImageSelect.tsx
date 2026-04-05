import React, { useState } from 'react';
import { Button } from 'rsuite';
import ImagePickerModal from './ImagePickerModal';
import { IMAGES } from './ImagePicker';

interface ServerImageSelectProps {
    extensions?: string[];
    value?: string;
    onChange: (val: string | null) => void;
    projectName?: string;
}

const ServerImageSelect: React.FC<ServerImageSelectProps> = ({
    extensions = IMAGES,
    value,
    onChange,
    projectName = 'default',
}) => {
    const [modalOpen, setModalOpen] = useState(false);

    const valueLabel = value || 'No image selected';

    return (
        <div className="image-picker-select-row">
            <span className="image-picker-value-label" title={valueLabel}>{valueLabel}</span>
            <Button size="sm" onClick={() => setModalOpen(true)}>Browse…</Button>
            <ImagePickerModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                value={value}
                onChange={onChange}
                extensions={extensions}
                projectName={projectName}
            />
        </div>
    );
};

export default ServerImageSelect;
