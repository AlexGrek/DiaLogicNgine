import React, { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { Button } from 'rsuite';
import ImagePickerModal from './ImagePickerModal';
import { IMAGES } from './ImagePicker';
import './ImagePicker.css';

interface ServerImageSelectProps {
    extensions?: string[];
    value?: string;
    onChange: (val: string | null) => void;
    projectName?: string;
    quickAiPrompt?: string;
    basicPromptSuffix?: string;
}

const ServerImageSelect: React.FC<ServerImageSelectProps> = ({
    extensions = IMAGES,
    value,
    onChange,
    projectName = 'default',
    quickAiPrompt,
    basicPromptSuffix,
}) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTrigger, setModalTrigger] = useState<'browse' | 'ai'>('browse');

    const valueLabel = value || 'No image selected';

    const combinedAiPrompt = [quickAiPrompt, basicPromptSuffix]
        .map(s => s?.trim())
        .filter(Boolean)
        .join(' ');

    const openBrowse = () => { setModalTrigger('browse'); setModalOpen(true); };
    const openAI = () => { setModalTrigger('ai'); setModalOpen(true); };

    return (
        <div className="image-picker-select-row">
            <span className="image-picker-value-label" title={valueLabel}>{valueLabel}</span>
            {quickAiPrompt && (
                <button
                    type="button"
                    className="image-picker-ai-btn"
                    title={`AI Generate: ${combinedAiPrompt}`}
                    onClick={openAI}
                >
                    <Lightbulb size={13} />
                </button>
            )}
            <Button size="sm" onClick={openBrowse}>Browse…</Button>
            <ImagePickerModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                value={value}
                onChange={onChange}
                extensions={extensions}
                projectName={projectName}
                initialSource={modalTrigger === 'ai' ? 'generate' : undefined}
                initialPrompt={modalTrigger === 'ai' ? combinedAiPrompt : undefined}
            />
        </div>
    );
};

export default ServerImageSelect;
