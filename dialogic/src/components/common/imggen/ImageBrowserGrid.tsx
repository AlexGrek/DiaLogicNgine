import React from 'react';

interface ImageBrowserGridProps {
    items: string[];
    getThumb: (filename: string) => string;
    isSelected: (filename: string) => boolean;
    onSelect: (filename: string) => void;
}

/** Thumbnail grid for browsing existing images (server / local / other projects). */
const ImageBrowserGrid: React.FC<ImageBrowserGridProps> = ({
    items,
    getThumb,
    isSelected,
    onSelect,
}) => (
    <div className="image-picker-modal-grid">
        {items.map(filename => (
            <div
                key={filename}
                className={`image-picker-modal-item${isSelected(filename) ? ' selected' : ''}`}
                onClick={() => onSelect(filename)}
                title={filename}
            >
                <img src={getThumb(filename)} alt={filename} />
                <span>{filename}</span>
            </div>
        ))}
        {items.length === 0 && (
            <div className="image-picker-modal-empty">No images found</div>
        )}
    </div>
);

export default ImageBrowserGrid;
