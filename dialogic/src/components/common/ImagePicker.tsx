import React, { ReactNode, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { Button } from 'rsuite';
import { generateImageUrl } from '../../Utils';
import ImagePickerModal from './ImagePickerModal';
import { projectImageApiBase, resolveImageProject } from './projectImages';
import { useProjectImages } from './ProjectImagesContext';
import './ImagePicker.css'

// eslint-disable-next-line react-refresh/only-export-components
export const isServerImage = (v: string) => !v.startsWith('game_assets/') && !v.startsWith('/') && !v.startsWith('http')

interface ImagePickerProps {
    extensions?: string[];
    value?: string;
    onChange: (val: string | null) => void;
    children?: ReactNode;
    projectName?: string;
    /** When set, enables AI thumbnail generation from this server image filename. */
    sourceImage?: string;
    /** When set, shows a lightbulb button that opens the modal on the AI Generate page with this prompt. */
    quickAiPrompt?: string;
    /** Global suffix appended to quickAiPrompt (e.g. from game.dev.basicPromptSuffix). */
    basicPromptSuffix?: string;
}

// eslint-disable-next-line react-refresh/only-export-components
export const IMAGES = ["jpeg", "jpg", "png", "bmp", "webp", "gif", "svg", "tiff"]

const ImagePicker: React.FC<ImagePickerProps> = ({
    extensions,
    value,
    onChange,
    children,
    projectName,
    sourceImage,
    quickAiPrompt,
    basicPromptSuffix,
}) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTrigger, setModalTrigger] = useState<'browse' | 'ai'>('browse');
    const contextProject = useProjectImages();
    const storageProject = resolveImageProject(projectName ?? contextProject);

    const previewSrc = value && isServerImage(value)
        ? `${projectImageApiBase(storageProject)}/image_thumbs/${encodeURIComponent(value)}`
        : generateImageUrl(value ?? '', storageProject);

    const valueLabel = value || 'No image selected';

    const openBrowse = () => { setModalTrigger('browse'); setModalOpen(true); };
    const openAI = () => { setModalTrigger('ai'); setModalOpen(true); };

    const combinedAiPrompt = [quickAiPrompt, basicPromptSuffix]
        .map(s => s?.trim())
        .filter(Boolean)
        .join(' ');

    return (
        <div className='image-picker-container'>
            <div className='image-picker-header'>{children}</div>
            <div className='image-picker-select-row'>
                <span className='image-picker-value-label' title={valueLabel}>{valueLabel}</span>
                {quickAiPrompt && (
                    <button
                        type="button"
                        className='image-picker-ai-btn'
                        title={`AI Generate: ${combinedAiPrompt}`}
                        onClick={openAI}
                    >
                        <Lightbulb size={13} />
                    </button>
                )}
                <Button size="sm" onClick={openBrowse}>Browse…</Button>
            </div>
            {value && <img alt="preview" src={previewSrc} />}
            <ImagePickerModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                value={value}
                onChange={onChange}
                extensions={extensions}
                projectName={storageProject}
                sourceImage={sourceImage}
                initialSource={modalTrigger === 'ai' ? 'generate' : undefined}
                initialPrompt={modalTrigger === 'ai' ? combinedAiPrompt : undefined}
            />
        </div>
    );
};

export default ImagePicker;
