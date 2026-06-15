import React, { useEffect, useRef, useState } from 'react';
import { Button, Modal } from 'rsuite';
import { useServerImages } from './useServerImages';
import { IMAGES, isServerImage } from './ImagePicker';
import { projectImageApiBase, resolveImageProject } from './projectImages';
import { useProjectImages } from './ProjectImagesContext';
import { DEFAULT_THUMBNAIL_PROMPT, Source } from './imggen/types';
import { useImageGeneration } from './imggen/useImageGeneration';
import SourceSidebar from './imggen/SourceSidebar';
import ImageBrowserGrid from './imggen/ImageBrowserGrid';
import GeneratePanel from './imggen/GeneratePanel';
import FromSourcePanel from './imggen/FromSourcePanel';
import GenerationResult from './imggen/GenerationResult';
import FullscreenPreview from './imggen/FullscreenPreview';

interface ImagePickerModalProps {
    open: boolean;
    onClose: () => void;
    value?: string;
    onChange: (val: string | null) => void;
    extensions?: string[];
    projectName?: string;
    /** Server image filename to use as img2img source for thumbnail generation. */
    sourceImage?: string;
    /** Open directly on this source tab. */
    initialSource?: Source;
    /** Pre-fill the AI generate prompt with this value. */
    initialPrompt?: string;
}

const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
    open,
    onClose,
    value,
    onChange,
    extensions,
    projectName,
    sourceImage,
    initialSource,
    initialPrompt,
}) => {
    const contextProject = useProjectImages();
    const storageProject = resolveImageProject(projectName ?? contextProject);
    const apiBase = projectImageApiBase(storageProject);

    const effectiveSourceImage =
        sourceImage && isServerImage(sourceImage) ? sourceImage : undefined;

    const [source, setSource] = useState<Source>('server');
    const [localFiles, setLocalFiles] = useState<string[]>([]);
    const [selected, setSelected] = useState<string | null>(value ?? null);
    const [otherProjects, setOtherProjects] = useState<string[]>([]);
    const [otherProject, setOtherProject] = useState<string | null>(null);
    const [otherImages, setOtherImages] = useState<string[]>([]);
    const [fullscreenSrc, setFullscreenSrc] = useState<string | null>(null);
    const imggenInputFileRef = useRef<HTMLInputElement>(null);

    const { images, uploading, fetchImages, uploadFile, deleteImage, thumbUrl, fileInputRef } =
        useServerImages(storageProject);

    const {
        gen,
        setGen,
        progress,
        genBusy,
        handleGenerate,
        handleGenerateFromSource,
        handleRegenerate,
        handleSelectGenerated,
        handleDeleteGenerated,
    } = useImageGeneration({
        storageProject,
        source,
        effectiveSourceImage,
        deleteImage,
        fetchImages,
        onChange,
        onClose,
    });

    useEffect(() => {
        if (!open) return;
        setSelected(value ?? null);
        if (initialSource) setSource(initialSource);
        if (initialPrompt) setGen(g => ({ ...g, prompt: initialPrompt }));
        fetchImages();
        fetch('game_assets/list.json')
            .then(r => r.json())
            .then(data => setLocalFiles(Array.isArray(data) ? data : []))
            .catch(() => setLocalFiles([]));
        fetch('/api/v1/projects')
            .then(r => r.json())
            .then(data => {
                const all: string[] = Array.isArray(data.projects)
                    ? data.projects.map((p: { name: string } | string) =>
                        typeof p === 'string' ? p : p.name)
                    : [];
                const others = all.filter(p => p !== storageProject);
                setOtherProjects(others);
                if (others.length > 0 && (otherProject === null || !others.includes(otherProject))) {
                    setOtherProject(others[0]);
                }
            })
            .catch(() => setOtherProjects([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, value, fetchImages, storageProject]);

    useEffect(() => {
        if (source !== 'other' || !otherProject) {
            setOtherImages([]);
            return;
        }
        fetch(`/api/v1/projects/${encodeURIComponent(otherProject)}/images`)
            .then(r => r.json())
            .then(data => setOtherImages(Array.isArray(data.images) ? data.images : []))
            .catch(() => setOtherImages([]));
    }, [source, otherProject]);

    // ── Source selection (with the fromSource thumbnail-defaults tweak) ──
    const handleSelectSource = (next: Source) => {
        setSource(next);
        if (next === 'fromSource') {
            setGen(g => ({
                ...g,
                prompt: g.prompt || DEFAULT_THUMBNAIL_PROMPT,
                width: g.width === 1024 && g.height === 1024 ? 512 : g.width,
                height: g.width === 1024 && g.height === 1024 ? 512 : g.height,
            }));
        }
    };

    // ── Browsing URL / value helpers ──
    const exts = extensions || IMAGES;
    const localItems = localFiles.filter(f => exts.some(e => f.endsWith(`.${e}`) || f.endsWith(e)));
    const currentItems =
        source === 'server' ? images :
        source === 'local' ? localItems :
        otherImages;

    const thumbUrlOther = (filename: string) =>
        `/api/v1/projects/${encodeURIComponent(otherProject ?? '')}/image_thumbs/${encodeURIComponent(filename)}`;

    const getThumb = (filename: string) => {
        if (source === 'server') return thumbUrl(filename);
        if (source === 'local') return `/game_assets/${filename}`;
        return thumbUrlOther(filename);
    };

    const getFullUrl = (filename: string) => {
        if (source === 'server') return `${apiBase}/images/${encodeURIComponent(filename)}`;
        if (source === 'local') return `/game_assets/${filename}`;
        return `/api/v1/projects/${encodeURIComponent(otherProject ?? '')}/images/${encodeURIComponent(filename)}`;
    };

    const getStoredValue = (filename: string) => {
        if (source === 'server') return filename;
        if (source === 'local') return `game_assets/${filename}`;
        return filename;
    };

    const selectedFullUrl = selected
        ? getFullUrl(selected.startsWith('game_assets/') ? selected.slice('game_assets/'.length) : selected)
        : null;

    const selectedLabel = selected
        ? (selected.startsWith('game_assets/') ? selected.slice('game_assets/'.length) : selected)
        : 'No image selected';

    const imggenInputFullUrl = gen.inputImage
        ? `${apiBase}/images/${encodeURIComponent(gen.inputImage)}`
        : null;
    const sourceImageFullUrl = effectiveSourceImage
        ? `${apiBase}/images/${encodeURIComponent(effectiveSourceImage)}`
        : null;

    // ── Selection / confirm handlers ──
    const handleConfirm = () => {
        onChange(selected);
        onClose();
    };

    const handleClear = () => {
        onChange(null);
        onClose();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            await uploadFile(file, (name) => {
                fetchImages();
                setSelected(name);
            });
        } catch (err) {
            setGen(g => ({ ...g, status: 'error', error: String(err) }));
        }
        e.target.value = '';
    };

    const handleImggenInputUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            await uploadFile(file, (name) => {
                fetchImages();
                setGen(g => ({ ...g, inputImage: name }));
            });
        } catch (err) {
            setGen(g => ({ ...g, status: 'error', error: String(err) }));
        }
        e.target.value = '';
    };

    const handleDeleteServerImage = async (filename: string) => {
        await deleteImage(filename);
        if (selected === filename) setSelected(null);
        fetchImages();
    };

    const isBrowsing = source !== 'generate' && source !== 'fromSource';

    const generationResult = (
        <GenerationResult
            gen={gen}
            progress={progress}
            genBusy={genBusy}
            apiBase={apiBase}
            onFullscreen={setFullscreenSrc}
            onSelect={handleSelectGenerated}
            onRegenerate={handleRegenerate}
            onDelete={handleDeleteGenerated}
        />
    );

    return (
    <>
        <Modal open={open} onClose={onClose} size="lg" className="image-picker-modal">
            <Modal.Header>
                <Modal.Title>Select Image</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="image-picker-modal-body">
                    <SourceSidebar
                        source={source}
                        onSelectSource={handleSelectSource}
                        otherProjects={otherProjects}
                        otherProject={otherProject}
                        onSelectOtherProject={setOtherProject}
                        showFromSource={!!effectiveSourceImage}
                    />

                    {isBrowsing ? (
                        <ImageBrowserGrid
                            items={currentItems}
                            getThumb={getThumb}
                            isSelected={(filename) => selected === getStoredValue(filename)}
                            onSelect={(filename) => setSelected(getStoredValue(filename))}
                        />
                    ) : source === 'fromSource' ? (
                        <FromSourcePanel
                            gen={gen}
                            setGen={setGen}
                            genBusy={genBusy}
                            storageProject={storageProject}
                            effectiveSourceImage={effectiveSourceImage}
                            sourceImageFullUrl={sourceImageFullUrl}
                            thumbUrl={thumbUrl}
                            onFullscreen={setFullscreenSrc}
                            onGenerate={handleGenerateFromSource}
                            result={generationResult}
                        />
                    ) : (
                        <GeneratePanel
                            gen={gen}
                            setGen={setGen}
                            genBusy={genBusy}
                            storageProject={storageProject}
                            images={images}
                            uploading={uploading}
                            exts={exts}
                            thumbUrl={thumbUrl}
                            imggenInputFileRef={imggenInputFileRef}
                            imggenInputFullUrl={imggenInputFullUrl}
                            onImggenInputUpload={handleImggenInputUpload}
                            onFullscreen={setFullscreenSrc}
                            onGenerate={handleGenerate}
                            result={generationResult}
                        />
                    )}
                </div>
            </Modal.Body>
            <Modal.Footer>
                <div className="image-picker-modal-footer">
                    {source === 'server' && (
                        <>
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
                        </>
                    )}
                    <span className="image-picker-modal-selected-name">{selectedLabel}</span>
                    <div className="image-picker-modal-actions">
                        <Button onClick={handleClear} appearance="subtle">Clear</Button>
                        <Button onClick={onClose} appearance="subtle">Cancel</Button>
                        {isBrowsing && selected && selectedFullUrl && (
                            <Button appearance="default" onClick={() => setFullscreenSrc(selectedFullUrl)}>
                                Preview
                            </Button>
                        )}
                        {source === 'server' && selected && (
                            <Button
                                onClick={() => handleDeleteServerImage(selected)}
                                appearance="subtle"
                                color="red"
                            >
                                Delete
                            </Button>
                        )}
                        {isBrowsing && (
                            <Button onClick={handleConfirm} appearance="primary">Select</Button>
                        )}
                    </div>
                </div>
            </Modal.Footer>
        </Modal>

        <FullscreenPreview src={fullscreenSrc} onClose={() => setFullscreenSrc(null)} />
    </>
    );
};

export default ImagePickerModal;
