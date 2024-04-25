import React, { ReactNode } from 'react';
import { generateImageUrl } from '../../Utils';
import PublicFileUrl from './PublicFileUrl';
import './ImagePicker.css'

interface ImagePickerProps {
    extensions?: string[];
    value?: string;
    onChange: (val: string | null) => void;
    children?: ReactNode;
}

export const IMAGES = ["jpeg", "jpg", "png", "bmp", "webp", "gif", "svg", "tiff"]

const ImagePicker: React.FC<ImagePickerProps> = (props) => {

    const { extensions, value, onChange } = props

    return (
        <div className='image-picker-container'>
            <div className='image-picker-header'>{props.children}</div>
            <PublicFileUrl extensions={extensions || IMAGES} value={value} onChange={onChange}></PublicFileUrl>
            <img alt="no image" src={generateImageUrl(value === undefined ? "" : value)}></img>
        </div>
    );
};

export default ImagePicker;
