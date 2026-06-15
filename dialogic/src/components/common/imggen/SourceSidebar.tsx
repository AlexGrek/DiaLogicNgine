import React from 'react';
import { Source } from './types';

interface SourceSidebarProps {
    source: Source;
    onSelectSource: (source: Source) => void;
    otherProjects: string[];
    otherProject: string | null;
    onSelectOtherProject: (project: string) => void;
    showFromSource: boolean;
}

const SOURCE_LABELS: { key: Source; label: string }[] = [
    { key: 'server', label: 'Server Uploads' },
    { key: 'local', label: 'Local Assets' },
    { key: 'other', label: 'Other Projects' },
];

/** Left-hand tab list selecting which image source / generation mode is shown. */
const SourceSidebar: React.FC<SourceSidebarProps> = ({
    source,
    onSelectSource,
    otherProjects,
    otherProject,
    onSelectOtherProject,
    showFromSource,
}) => (
    <div className="image-picker-modal-sidebar">
        {SOURCE_LABELS.map(({ key, label }) => (
            <React.Fragment key={key}>
                <div
                    className={`image-picker-modal-source${source === key ? ' active' : ''}`}
                    onClick={() => onSelectSource(key)}
                >
                    {label}
                </div>
                {key === 'other' && source === 'other' && otherProjects.length > 0 && (
                    <div className="image-picker-modal-other-projects">
                        {otherProjects.map(p => (
                            <div
                                key={p}
                                className={`image-picker-modal-other-project${otherProject === p ? ' active' : ''}`}
                                onClick={() => onSelectOtherProject(p)}
                            >
                                {p}
                            </div>
                        ))}
                    </div>
                )}
                {key === 'other' && source === 'other' && otherProjects.length === 0 && (
                    <div className="image-picker-modal-empty" style={{ padding: '8px 16px', fontSize: 12 }}>
                        No other projects
                    </div>
                )}
            </React.Fragment>
        ))}
        <div
            className={`image-picker-modal-source${source === 'generate' ? ' active' : ''}`}
            onClick={() => onSelectSource('generate')}
        >
            AI Generate
        </div>
        {showFromSource && (
            <div
                className={`image-picker-modal-source${source === 'fromSource' ? ' active' : ''}`}
                onClick={() => onSelectSource('fromSource')}
            >
                From source image
            </div>
        )}
    </div>
);

export default SourceSidebar;
