import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import Loc from '../../../game/Loc';

interface LocationGraphViewProps {
    locs: Loc[];
    onLocClick: (uid: string) => void;
}

mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });

let _seq = 0;

function safeId(uid: string): string {
    return 'n_' + uid.replace(/[^a-zA-Z0-9_]/g, '_');
}

function buildMermaidDef(locs: Loc[], cbName: string): { def: string; safeToUid: Record<string, string> } {
    const lines: string[] = ['flowchart LR'];
    const safeToUid: Record<string, string> = {};

    for (const loc of locs) {
        const sid = safeId(loc.uid);
        safeToUid[sid] = loc.uid;
        const label = (loc.displayName.trim() || loc.uid).replace(/"/g, "'");
        lines.push(`    ${sid}["${label}"]`);
    }

    const seen = new Set<string>();
    for (const loc of locs) {
        for (const targetUid of loc.routes) {
            const target = locs.find(l => l.uid === targetUid);
            if (!target) continue;
            const a = safeId(loc.uid);
            const b = safeId(targetUid);
            if (seen.has(`${a}>${b}`) || seen.has(`${b}>${a}`)) continue;
            const bidir = target.routes.includes(loc.uid);
            if (bidir) {
                seen.add(`${a}>${b}`);
                seen.add(`${b}>${a}`);
                lines.push(`    ${a} <--> ${b}`);
            } else {
                seen.add(`${a}>${b}`);
                lines.push(`    ${a} --> ${b}`);
            }
        }
    }

    // click directives — one per node
    for (const loc of locs) {
        lines.push(`    click ${safeId(loc.uid)} ${cbName}`);
    }

    return { def: lines.join('\n'), safeToUid };
}

const LocationGraphView: React.FC<LocationGraphViewProps> = ({ locs, onLocClick }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    // stable ref so the mermaid callback always sees the latest handler
    const onLocClickRef = useRef(onLocClick);
    onLocClickRef.current = onLocClick;

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const seq = ++_seq;
        const cbName = `_mmdLocClick${seq}`;
        const { def, safeToUid } = buildMermaidDef(locs, cbName);

        // register window-level callback that mermaid's click directive calls
        (window as unknown as Record<string, unknown>)[cbName] = (sid: string) => {
            const uid = safeToUid[sid];
            if (uid !== undefined) onLocClickRef.current(uid);
        };

        let cancelled = false;
        mermaid.render(`loc-graph-${seq}`, def).then(({ svg, bindFunctions }) => {
            if (cancelled || !containerRef.current) return;
            containerRef.current.innerHTML = svg;
            bindFunctions?.(containerRef.current);
            // add pointer cursor to all clickable nodes
            containerRef.current.querySelectorAll('.node').forEach(n => {
                (n as HTMLElement).style.cursor = 'pointer';
            });
        }).catch((err: unknown) => {
            if (cancelled || !containerRef.current) return;
            console.error('Mermaid location graph error:', err);
            containerRef.current.textContent = String(err);
        });

        return () => {
            cancelled = true;
            delete (window as unknown as Record<string, unknown>)[cbName];
        };
    }, [locs]);  // locs identity changes when game changes — that's the right trigger

    if (locs.length === 0) {
        return <p style={{ padding: '16px', color: '#888' }}>No locations defined yet.</p>;
    }

    return (
        <div style={{ padding: '16px', overflowX: 'auto' }}>
            <div ref={containerRef} />
        </div>
    );
};

export default LocationGraphView;
