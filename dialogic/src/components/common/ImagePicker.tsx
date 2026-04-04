import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Button, Nav, SelectPicker, Stack } from 'rsuite';
import { generateImageUrl } from '../../Utils';
import PublicFileUrl from './PublicFileUrl';
import './ImagePicker.css'

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
    projectName = "default",
}) => {
    const [tab, setTab] = useState<"local" | "server">("server");
    const [serverImages, setServerImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchServerImages = useCallback(() => {
        fetch(`/api/v1/projects/${projectName}/images`)
            .then(r => r.json())
            .then(data => setServerImages(data.images ?? []))
            .catch(() => setServerImages([]));
    }, [projectName]);

    useEffect(() => {
        if (tab === "server") fetchServerImages();
    }, [tab, fetchServerImages]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const form = new FormData();
        form.append("file", file);
        await fetch(`/api/v1/projects/${projectName}/images/${encodeURIComponent(file.name)}`, {
            method: "PUT",
            body: form,
        });
        setUploading(false);
        fetchServerImages();
        onChange(file.name);
        e.target.value = "";
    };

    const exts = extensions || IMAGES;

    const serverImageData = serverImages.map(img => ({
        label: img,
        value: img,
    }));

    const thumbUrl = (filename: string) =>
        `/api/v1/projects/${projectName}/image_thumbs/${encodeURIComponent(filename)}`;

    const previewSrc = tab === "server" && value
        ? thumbUrl(value)
        : generateImageUrl(value ?? "");

    return (
        <div className='image-picker-container'>
            <div className='image-picker-header'>{children}</div>
            <Nav activeKey={tab} onSelect={(k) => setTab(k as "local" | "server")} appearance="subtle" className='image-picker-nav'>
                <Nav.Item eventKey="local">Local</Nav.Item>
                <Nav.Item eventKey="server">Server</Nav.Item>
            </Nav>
            {tab === "local" && (
                <PublicFileUrl extensions={exts} value={value} onChange={onChange} />
            )}
            {tab === "server" && (
                <Stack spacing={6} direction="column" alignItems="flex-start" className='image-picker-server'>
                    <SelectPicker
                        style={{ width: "100%" }}
                        data={serverImageData}
                        value={value ?? null}
                        onChange={onChange}
                        placeholder="Pick uploaded image…"
                        renderMenuItem={(label, item) => (
                            <Stack spacing={8} alignItems="center">
                                <img
                                    src={thumbUrl(item.value as string)}
                                    alt=""
                                    className="image-picker-menu-thumb"
                                />
                                <span>{label}</span>
                            </Stack>
                        )}
                    />
                    <Stack spacing={6}>
                        <Button size="sm" loading={uploading} onClick={() => fileInputRef.current?.click()}>
                            Upload image
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={exts.map(e => `.${e}`).join(",")}
                            style={{ display: "none" }}
                            onChange={handleUpload}
                        />
                    </Stack>
                </Stack>
            )}
            <img alt="no image" src={previewSrc} />
        </div>
    );
};

export default ImagePicker;
