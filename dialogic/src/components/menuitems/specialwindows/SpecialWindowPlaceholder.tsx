import React from 'react';
import { Panel, Tag } from 'rsuite';

interface SpecialWindowPlaceholderProps {
    title: string;
    description: string;
}

/** Placeholder shown for special-window types that are not implemented yet. */
const SpecialWindowPlaceholder: React.FC<SpecialWindowPlaceholderProps> = ({ title, description }) => (
    <div style={{ maxWidth: '52em', margin: '0 auto' }} data-testid="special-window-placeholder">
        <Panel bordered>
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#888' }}>
                <Tag color="orange" size="sm" style={{ marginBottom: 12 }}>Not implemented yet</Tag>
                <h4 style={{ margin: '0 0 8px', color: '#ccc' }}>{title}</h4>
                <p style={{ fontSize: '0.9em', maxWidth: '32em', margin: '0 auto' }}>{description}</p>
            </div>
        </Panel>
    </div>
);

export default SpecialWindowPlaceholder;
