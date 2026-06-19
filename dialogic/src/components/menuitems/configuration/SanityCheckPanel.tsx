import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Loader, Message, Panel, Stack, Tag } from 'rsuite';
import ReloadIcon from '@rsuite/icons/Reload';
import { useNavigate } from 'react-router-dom';
import { GameDescription } from '../../../game/GameDescription';
import { runSanityCheck, SanityIssue, SanityIssueCategory, SanitySeverity } from '../../../game/sanityCheck';
import { useProjectImages } from '../../common/ProjectImagesContext';
import { resolveImageProject, projectImageApiBase } from '../../common/projectImages';

interface SanityCheckPanelProps {
    game: GameDescription;
}

const CATEGORY_LABELS: Record<SanityIssueCategory, string> = {
    link: 'Links',
    reference: 'References',
    file: 'File references',
};

const SEVERITY_COLOR: Record<SanitySeverity, 'red' | 'orange'> = {
    error: 'red',
    warning: 'orange',
};

const SanityCheckPanel: React.FC<SanityCheckPanelProps> = ({ game }) => {
    const navigate = useNavigate();
    const project = resolveImageProject(useProjectImages());
    const apiBase = projectImageApiBase(project);

    const [imageFiles, setImageFiles] = useState<string[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const loadImages = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch(`${apiBase}/images`);
            const data = await r.json();
            setImageFiles(Array.isArray(data.images) ? data.images : []);
        } catch {
            // Server unreachable: file references cannot be verified, skip them.
            setImageFiles(null);
        } finally {
            setLoading(false);
        }
    }, [apiBase]);

    useEffect(() => { loadImages(); }, [loadImages]);

    const result = useMemo(() => runSanityCheck(game, imageFiles), [game, imageFiles]);

    const grouped = useMemo(() => {
        const groups: Record<SanityIssueCategory, SanityIssue[]> = { link: [], reference: [], file: [] };
        for (const issue of result.issues) groups[issue.category].push(issue);
        return groups;
    }, [result]);

    const errorCount = result.issues.filter(i => i.severity === 'error').length;
    const warningCount = result.issues.filter(i => i.severity === 'warning').length;
    const clean = result.issues.length === 0;

    const renderIssue = (issue: SanityIssue, key: number) => (
        <div key={key} className="sanity-issue" data-testid="sanity-issue">
            <Tag size="sm" color={SEVERITY_COLOR[issue.severity]} className="sanity-issue-sev">
                {issue.severity}
            </Tag>
            <div className="sanity-issue-body">
                <div className="sanity-issue-message">{issue.message}</div>
                <div className="sanity-issue-location">
                    {issue.location}
                    {issue.dialogName && (
                        <Button
                            size="xs"
                            appearance="link"
                            className="sanity-issue-go"
                            onClick={() => navigate('/dialog/' + encodeURIComponent(issue.dialogName!))}
                        >
                            Open dialog
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="saveload-content">
            <Panel bordered className="saveload-section">
                <Stack justifyContent="space-between" alignItems="center" style={{ marginBottom: 10 }}>
                    <p className="home-section-label" style={{ margin: 0 }}>
                        Sanity check
                        {errorCount > 0 && (
                            <Tag size="sm" color="red" style={{ marginLeft: 8 }}>{errorCount} error{errorCount === 1 ? '' : 's'}</Tag>
                        )}
                        {warningCount > 0 && (
                            <Tag size="sm" color="orange" style={{ marginLeft: 6 }}>{warningCount} warning{warningCount === 1 ? '' : 's'}</Tag>
                        )}
                    </p>
                    <Button size="xs" appearance="subtle" onClick={loadImages} disabled={loading} data-testid="sanity-rerun">
                        {loading ? <Loader size="xs" /> : <ReloadIcon />}
                    </Button>
                </Stack>

                <p style={{ color: '#888', fontSize: '0.85em', marginBottom: 12 }}>
                    Scans every dialog, location and character for dangling links and missing
                    image files. Checked {result.stats.links} link(s) across {result.stats.dialogs} dialog(s),
                    {' '}{result.stats.windows} window(s), {result.stats.locations} location(s) and
                    {' '}{result.stats.characters} character(s).
                </p>

                {!result.checkedFiles && (
                    <Message type="warning" style={{ marginBottom: 12 }} data-testid="sanity-files-skipped">
                        Image server unavailable — file references were not checked.
                    </Message>
                )}

                {clean && (
                    <Message type="success" data-testid="sanity-clean">
                        No dangling links or missing files found. Everything checks out.
                    </Message>
                )}

                {(['link', 'reference', 'file'] as SanityIssueCategory[]).map(cat => (
                    grouped[cat].length > 0 && (
                        <div key={cat} style={{ marginBottom: 16 }}>
                            <p className="home-section-label" style={{ fontSize: '0.85em', marginBottom: 6 }}>
                                {CATEGORY_LABELS[cat]}
                                <Tag size="sm" style={{ marginLeft: 8 }}>{grouped[cat].length}</Tag>
                            </p>
                            <Stack direction="column" spacing={6} alignItems="stretch">
                                {grouped[cat].map(renderIssue)}
                            </Stack>
                        </div>
                    )
                ))}
            </Panel>
        </div>
    );
};

export default SanityCheckPanel;
