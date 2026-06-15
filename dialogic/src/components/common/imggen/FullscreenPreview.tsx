import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface FullscreenPreviewProps {
    src: string | null;
    onClose: () => void;
}

/** Click/Escape-dismissable fullscreen image overlay, rendered via a portal. */
const FullscreenPreview: React.FC<FullscreenPreviewProps> = ({ src, onClose }) => {
    useEffect(() => {
        if (!src) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [src, onClose]);

    if (!src) return null;

    return createPortal(
        <div className="imggen-fullscreen" onClick={onClose}>
            <img src={src} alt="Preview" onClick={e => e.stopPropagation()} />
        </div>,
        document.body
    );
};

export default FullscreenPreview;
