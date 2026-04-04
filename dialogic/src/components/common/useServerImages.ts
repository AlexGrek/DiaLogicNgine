import { useCallback, useRef, useState } from 'react';

export function useServerImages(projectName: string) {
    const [images, setImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchImages = useCallback(() => {
        fetch(`/api/v1/projects/${projectName}/images`)
            .then(r => r.json())
            .then(data => setImages(data.images ?? []))
            .catch(() => setImages([]));
    }, [projectName]);

    const uploadFile = useCallback(async (
        file: File,
        onSelect: (name: string) => void,
    ) => {
        setUploading(true);
        const form = new FormData();
        form.append('file', file);
        await fetch(`/api/v1/projects/${projectName}/images/${encodeURIComponent(file.name)}`, {
            method: 'PUT',
            body: form,
        });
        setUploading(false);
        onSelect(file.name);
    }, [projectName]);

    const thumbUrl = useCallback(
        (filename: string) =>
            `/api/v1/projects/${projectName}/image_thumbs/${encodeURIComponent(filename)}`,
        [projectName],
    );

    return { images, uploading, fetchImages, uploadFile, thumbUrl, fileInputRef };
}
