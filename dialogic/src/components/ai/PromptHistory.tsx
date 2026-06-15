import React, { useCallback, useRef, useState } from 'react';
import { IconButton, Loader, Popover, Whisper } from 'rsuite';
import type { WhisperInstance } from 'rsuite';
import HistoryIcon from '@rsuite/icons/History';
import TrashIcon from '@rsuite/icons/Trash';

export interface PromptHistoryEntry {
    prompt: string;
    ts: number;
    meta?: Record<string, unknown>;
}

interface PromptHistoryProps {
    /** Storage project name (composite key part 1). */
    project: string;
    /** Generation type: "dialog" | "text" | "image" (composite key part 2). */
    workflow: string;
    /** Called with the chosen past prompt. */
    onPick: (prompt: string) => void;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    /** Optional inline style for the trigger button. */
    style?: React.CSSProperties;
}

const fmtTime = (ts: number): string => {
    try {
        return new Date(ts).toLocaleString();
    } catch {
        return '';
    }
};

/**
 * A small "past prompts" popup. Fetches prompt history for the given
 * project + workflow from the host database and lets the user re-use or
 * delete previous prompts.
 */
const PromptHistory: React.FC<PromptHistoryProps> = ({
    project,
    workflow,
    onPick,
    size = 'sm',
    style,
}) => {
    const [entries, setEntries] = useState<PromptHistoryEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const triggerRef = useRef<WhisperInstance>(null);

    const base = `/api/v1/prompts/${encodeURIComponent(project || 'default')}/${encodeURIComponent(workflow)}`;

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const r = await fetch(base);
            if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
            const data: PromptHistoryEntry[] = await r.json();
            setEntries(Array.isArray(data) ? data : []);
        } catch (e) {
            setError(`Could not load history: ${e}`);
        } finally {
            setLoading(false);
        }
    }, [base]);

    const handleDelete = useCallback(
        async (ts: number, ev: React.MouseEvent) => {
            ev.stopPropagation();
            setEntries(prev => prev.filter(e => e.ts !== ts));
            try {
                await fetch(`${base}/${ts}`, { method: 'DELETE' });
            } catch {
                // optimistic; reload to resync on failure
                load();
            }
        },
        [base, load],
    );

    const pick = useCallback(
        (prompt: string) => {
            onPick(prompt);
            triggerRef.current?.close();
        },
        [onPick],
    );

    return (
        <Whisper
            ref={triggerRef}
            placement="bottomEnd"
            trigger="click"
            onOpen={load}
            speaker={
                <Popover title="Past prompts" className="prompt-history-popover">
                    <div className="prompt-history-list">
                        {loading && <Loader content="Loading…" />}
                        {error && <div className="prompt-history-error">{error}</div>}
                        {!loading && !error && entries.length === 0 && (
                            <div className="prompt-history-empty">No past prompts yet</div>
                        )}
                        {!loading &&
                            entries.map(entry => (
                                <div
                                    key={entry.ts}
                                    className="prompt-history-item"
                                    onClick={() => pick(entry.prompt)}
                                    title={entry.prompt}
                                >
                                    <div className="prompt-history-item-text">{entry.prompt}</div>
                                    <div className="prompt-history-item-meta">
                                        <span>{fmtTime(entry.ts)}</span>
                                        <IconButton
                                            size="xs"
                                            appearance="subtle"
                                            icon={<TrashIcon />}
                                            title="Delete"
                                            onClick={ev => handleDelete(entry.ts, ev)}
                                        />
                                    </div>
                                </div>
                            ))}
                    </div>
                </Popover>
            }
        >
            <IconButton
                size={size}
                appearance="subtle"
                icon={<HistoryIcon />}
                title="Past prompts"
                style={style}
            />
        </Whisper>
    );
};

export default PromptHistory;
