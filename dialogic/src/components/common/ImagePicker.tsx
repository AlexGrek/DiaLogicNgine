import React, { ReactNode, useState } from 'react';
import { Button } from 'rsuite';
import { generateImageUrl } from '../../Utils';
import ImagePickerModal from './ImagePickerModal';
import './ImagePicker.css'

const isServerImage = (v: string) => !v.startsWith('game_assets/') && !v.startsWith('/') && !v.startsWith('http')

interface ImagePickerProps {
    extensions?: string[];
    value?: string;
    onChange: (val: string | null) => void;
    children?: ReactNode;
    projectName?: string;
}

export const IMAGES = ["jpeg", "jpg", "png", "bmp", "webp", "gif", "svg", "tiff"]

const ImagePicker: React.FC<ImagePickerProps> = ({
    extensions,
    value,
    onChange,
    children,
    projectName = 'default',
}) => {
    const [modalOpen, setModalOpen] = useState(false);

    const previewSrc = value && isServerImage(value)
        ? `/api/v1/projects/${projectName}/image_thumbs/${encodeURIComponent(value)}`
        : generateImageUrl(value ?? '');

    const valueLabel = value || 'No image selected';

    return (
        <div className='image-picker-container'>
            <div className='image-picker-header'>{children}</div>
            <div className='image-picker-select-row'>
                <span className='image-picker-value-label' title={valueLabel}>{valueLabel}</span>
                <Button size="sm" onClick={() => setModalOpen(true)}>Browse…</Button>
            </div>
            {value && <img alt="preview" src={previewSrc} />}
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

export default ImagePicker;
