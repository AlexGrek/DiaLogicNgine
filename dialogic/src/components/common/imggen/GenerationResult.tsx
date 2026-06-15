import React from 'react';
import { Button } from 'rsuite';
import { GenState } from './types';

interface GenerationResultProps {
    gen: GenState;
    progress: number;
    genBusy: boolean;
    apiBase: string;
    onFullscreen: (src: string) => void;
    onSelect: () => void;
    onRegenerate: () => void;
    onDelete: () => void;
}

/** The right-hand result pane shared by the generate and from-source panels. */
const GenerationResult: React.FC<GenerationResultProps> = ({
    gen,
    progress,
    genBusy,
    apiBase,
    onFullscreen,
    onSelect,
    onRegenerate,
    onDelete,
}) => {
    const resultUrl = gen.resultFilename
        ? `${apiBase}/images/${encodeURIComponent(gen.resultFilename)}`
        : null;

    return (
        <div className="imggen-result">
            {gen.status === 'idle' && (
                <div className="imggen-placeholder">Result will appear here</div>
            )}
            {genBusy && (
                <div className="imggen-placeholder">
                    {gen.status === 'submitting' ? 'Submitting task…' : 'Generating image…'}
                </div>
            )}
            {gen.status === 'polling' && gen.avgTime && (
                <div className="imggen-progress-wrap">
                    <div className="imggen-progress-bar" style={{ width: `${progress}%` }} />
                    <span className="imggen-progress-label">~{Math.round(gen.avgTime)}s</span>
                </div>
            )}
            {gen.status === 'error' && (
                <div className="imggen-error">{gen.error}</div>
            )}
            {gen.status === 'done' && resultUrl && (
                <>
                    <img
                        className="imggen-preview"
                        src={resultUrl}
                        alt="Generated"
                        onClick={() => onFullscreen(resultUrl)}
                    />
                    <div className="imggen-result-actions">
                        <Button appearance="primary" size="sm" onClick={onSelect}>
                            Select
                        </Button>
                        <Button appearance="default" size="sm" onClick={() => onFullscreen(resultUrl)}>
                            Preview
                        </Button>
                        <Button appearance="default" size="sm" onClick={onRegenerate}>
                            Regenerate
                        </Button>
                        <Button appearance="subtle" size="sm" onClick={onDelete}>
                            Delete
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
};

export default GenerationResult;
