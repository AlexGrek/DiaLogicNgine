import React, { ReactNode } from 'react';
import { generateImageUrl } from '../../Utils';
import ServerImageSelect from './ServerImageSelect';
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
    const previewSrc = value && isServerImage(value)
        ? `/api/v1/projects/${projectName}/image_thumbs/${encodeURIComponent(value)}`
        : generateImageUrl(value ?? '');

    return (
        <div className='image-picker-container'>
            <div className='image-picker-header'>{children}</div>
            <ServerImageSelect
                extensions={extensions}
                value={value}
                onChange={onChange}
                projectName={projectName}
            />
            <img alt="no image" src={previewSrc} />
        </div>
    );
};

export default ImagePicker;
