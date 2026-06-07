import { useCallback, useRef, useState } from 'react';
import { projectImageApiBase } from './projectImages';

export function useServerImages(projectName: string) {
    const apiBase = projectImageApiBase(projectName);

    const [images, setImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchImages = useCallback(() => {
        fetch(`${apiBase}/images`)
            .then(r => r.json())
            .then(data => setImages(data.images ?? []))
            .catch(() => setImages([]));
    }, [apiBase]);

    const uploadFile = useCallback(async (
        file: File,
        onSelect: (name: string) => void,
    ) => {
        setUploading(true);
        const form = new FormData();
        form.append('file', file);
        const r = await fetch(`${apiBase}/images/${encodeURIComponent(file.name)}`, {
            method: 'PUT',
            body: form,
        });
        setUploading(false);
        if (!r.ok) {
            throw new Error(await r.text());
        }
        onSelect(file.name);
    }, [apiBase]);

    const thumbUrl = useCallback(
        (filename: string) =>
            `${apiBase}/image_thumbs/${encodeURIComponent(filename)}`,
        [apiBase],
    );

    const deleteImage = useCallback(async (filename: string) => {
        await fetch(`${apiBase}/images/${encodeURIComponent(filename)}`, {
            method: 'DELETE',
        });
    }, [apiBase]);

    return { images, uploading, fetchImages, uploadFile, deleteImage, thumbUrl, fileInputRef };
}
