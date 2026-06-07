import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import Dialog, { LinkType } from '../game/Dialog';

interface DialogGraphViewProps {
    dialog: Dialog;
    onWindowClick: (uid: string) => void;
}

mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });

let _seq = 0;

function safeId(uid: string): string {
    return 'w_' + uid.replace(/[^a-zA-Z0-9_]/g, '_');
}

function truncate(text: string, max = 28): string {
    const t = text.trim().replace(/\n/g, ' ');
    return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

function buildMermaidDef(dialog: Dialog, cbName: string): { def: string; safeToUid: Record<string, string> } {
    const lines: string[] = ['flowchart TD'];
    const safeToUid: Record<string, string> = {};
    const winUids = new Set(dialog.windows.map(w => w.uid));

    // Node declarations
    for (let i = 0; i < dialog.windows.length; i++) {
        const win = dialog.windows[i];
        const sid = safeId(win.uid);
        safeToUid[sid] = win.uid;
        const preview = win.text.main ? truncate(win.text.main) : '';
        const label = preview
            ? `${win.uid.replace(/"/g, "'")}\\n${preview.replace(/"/g, "'")}`
            : win.uid.replace(/"/g, "'");
        // First window gets stadium shape (entry point)
        if (i === 0) {
            lines.push(`    ${sid}(["${label}"])`);
        } else {
            lines.push(`    ${sid}["${label}"]`);
        }
    }

    // Edge declarations — collect intra-dialog connections
    const edgeSeen = new Set<string>();
    for (const win of dialog.windows) {
        const from = safeId(win.uid);
        for (const link of win.links) {
            const dirs = [link.mainDirection, ...link.alternativeDirections];
            for (const dir of dirs) {
                let targetUid: string | undefined;
                if (
                    dir.type === LinkType.Local ||
                    dir.type === LinkType.Jump ||
                    dir.type === LinkType.ResetJump ||
                    dir.type === LinkType.QuickReply
                ) {
                    targetUid = dir.direction;
                } else if (dir.type === LinkType.Push) {
                    if (dir.qualifiedDirection?.dialog === dialog.name) {
                        targetUid = dir.qualifiedDirection.window;
                    }
                }
                if (!targetUid || !winUids.has(targetUid)) continue;
                const to = safeId(targetUid);
                const key = `${from}>${to}`;
                if (edgeSeen.has(key)) continue;
                edgeSeen.add(key);
                lines.push(`    ${from} --> ${to}`);
            }
        }
    }

    // Click directives
    for (const win of dialog.windows) {
        lines.push(`    click ${safeId(win.uid)} ${cbName}`);
    }

    return { def: lines.join('\n'), safeToUid };
}

const DialogGraphView: React.FC<DialogGraphViewProps> = ({ dialog, onWindowClick }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const onClickRef = useRef(onWindowClick);
    onClickRef.current = onWindowClick;

    useEffect(() => {
        if (!containerRef.current) return;
        const seq = ++_seq;
        const cbName = `_mmdDlgClick${seq}`;
        const { def, safeToUid } = buildMermaidDef(dialog, cbName);

        (window as unknown as Record<string, unknown>)[cbName] = (sid: string) => {
            const uid = safeToUid[sid];
            if (uid !== undefined) onClickRef.current(uid);
        };

        let cancelled = false;
        mermaid.render(`dlg-graph-${seq}`, def).then(({ svg, bindFunctions }) => {
            if (cancelled || !containerRef.current) return;
            containerRef.current.innerHTML = svg;
            bindFunctions?.(containerRef.current);
            containerRef.current.querySelectorAll('.node').forEach(n => {
                (n as HTMLElement).style.cursor = 'pointer';
            });
        }).catch((err: unknown) => {
            if (cancelled || !containerRef.current) return;
            console.error('Mermaid dialog graph error:', err);
            containerRef.current.textContent = String(err);
        });

        return () => {
            cancelled = true;
            delete (window as unknown as Record<string, unknown>)[cbName];
        };
    }, [dialog]);

    if (dialog.windows.length === 0) {
        return <p style={{ padding: '16px', color: '#888' }}>No windows in this dialog yet.</p>;
    }

    return (
        <div style={{ padding: '16px', overflowX: 'auto', overflowY: 'auto' }}>
            <div ref={containerRef} />
        </div>
    );
};

export default DialogGraphView;
