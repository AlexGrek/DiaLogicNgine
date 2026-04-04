import React, { useEffect, useState } from 'react';
import { Button, Nav, SelectPicker, Stack } from 'rsuite';
import PublicFileUrl from './PublicFileUrl';
import { useServerImages } from './useServerImages';
import { IMAGES } from './ImagePicker';

interface ServerImageSelectProps {
    extensions?: string[];
    value?: string;
    onChange: (val: string | null) => void;
    projectName?: string;
}

const ServerImageSelect: React.FC<ServerImageSelectProps> = ({
    extensions,
    value,
    onChange,
    projectName = 'default',
}) => {
    const [tab, setTab] = useState<'local' | 'server'>('server');
    const { images, uploading, fetchImages, uploadFile, thumbUrl, fileInputRef } =
        useServerImages(projectName);

    useEffect(() => {
        if (tab === 'server') fetchImages();
    }, [tab, fetchImages]);

    const handleTabChange = (t: string) => {
        setTab(t as 'local' | 'server');
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await uploadFile(file, (name) => {
            fetchImages();
            onChange(name);
        });
        e.target.value = '';
    };

    const exts = extensions || IMAGES;
    const serverData = images.map(img => ({ label: img, value: img }));

    return (
        <>
            <Nav
                activeKey={tab}
                onSelect={handleTabChange}
                appearance="subtle"
                className="image-picker-nav"
            >
                <Nav.Item eventKey="local">Local</Nav.Item>
                <Nav.Item eventKey="server">Server</Nav.Item>
            </Nav>

            {tab === 'local' && (
                <PublicFileUrl
                    extensions={exts}
                    value={value?.startsWith('game_assets/') ? value.slice('game_assets/'.length) : value}
                    onChange={(v) => onChange(v ? `game_assets/${v}` : null)}
                />
            )}

            {tab === 'server' && (
                <Stack spacing={6} direction="column" alignItems="flex-start" className="image-picker-server">
                    <SelectPicker
                        style={{ width: '100%' }}
                        data={serverData}
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
                            accept={exts.map(e => `.${e}`).join(',')}
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />
                    </Stack>
                </Stack>
            )}
        </>
    );
};

export default ServerImageSelect;
