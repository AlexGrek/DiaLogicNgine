import React, { useEffect, useRef, useState } from 'react';
import { Button, Message, SelectPicker } from 'rsuite';
import { Eraser } from 'lucide-react';

interface RemoveBackgroundButtonProps {
    /** Server image filename to cut out. */
    image?: string;
    storageProject: string;
    /** Called with the new transparent image filename. */
    onDone: (filename: string) => void;
}

const DEFAULT_MODEL = 'onnx.bgremove.birefnet-general';
const isServerImage = (v: string) => !v.startsWith('game_assets/') && !v.startsWith('/') && !v.startsWith('http');

/**
 * Removes the background of a project image through OffloadMQ (onnx.bgremove.*)
 * and hands back a new transparent, subject-cropped WebP.
 */
const RemoveBackgroundButton: React.FC<RemoveBackgroundButtonProps> = ({ image, storageProject, onDone }) => {
    const [models, setModels] = useState<string[] | null>(null);
    const [model, setModel] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const cancelled = useRef(false);

    useEffect(() => {
        cancelled.current = false;
        return () => { cancelled.current = true; };
    }, []);

    const loadModels = () => {
        if (models !== null) return;
        fetch('/api/v1/imggen/bgremove/models')
            .then(r => (r.ok ? r.json() : []))
            .then((list: string[]) => {
                setModels(list);
                setModel(m => m ?? (list.includes(DEFAULT_MODEL) ? DEFAULT_MODEL : list[0] ?? null));
            })
            .catch(() => setModels([]));
    };

    useEffect(loadModels, []); // eslint-disable-line react-hooks/exhaustive-deps

    const run = async () => {
        if (!image || !model) return;
        setBusy(true);
        setError(null);
        try {
            const r = await fetch('/api/v1/imggen/bgremove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_name: storageProject, image, model }),
            });
            if (!r.ok) throw new Error(await r.text());
            const task = await r.json();
            const statusUrl = `/api/v1/imggen/status/${encodeURIComponent(storageProject)}/${encodeURIComponent(task.cap)}/${encodeURIComponent(task.id)}/${encodeURIComponent(task.output_bucket)}`;
            for (let i = 0; i < 100 && !cancelled.current; i++) {
                await new Promise(res => setTimeout(res, 3000));
                const s = await fetch(statusUrl).then(x => x.json()).catch(() => null);
                if (!s) continue;
                if (s.status === 'completed' && s.filename) {
                    onDone(s.filename);
                    return;
                }
                if (s.status === 'failed' || s.status === 'canceled') throw new Error(s.error ?? 'Background removal failed');
            }
            if (!cancelled.current) throw new Error('Timed out waiting for background removal');
        } catch (e) {
            if (!cancelled.current) setError(String(e));
        } finally {
            if (!cancelled.current) setBusy(false);
        }
    };

    const usable = !!image && isServerImage(image);
    const noModels = models !== null && models.length === 0;

    return (
        <div className="remove-bg-row" data-testid="remove-bg" style={{ display: 'flex', gap: 6, alignItems: 'center', margin: '6px 8px' }}>
            <Button
                size="sm"
                startIcon={<Eraser size={14} />}
                loading={busy}
                disabled={!usable || !model || busy}
                onClick={run}
                title={noModels ? 'No background-removal agents are online' : 'Cut the person out to a transparent WebP'}
                data-testid="remove-bg-button"
            >
                Remove background
            </Button>
            {models && models.length > 1 && (
                <SelectPicker size="sm" cleanable={false} searchable={false} data={models.map(m => ({ value: m, label: m.replace('onnx.bgremove.', '') }))} value={model} onChange={setModel} style={{ width: 170 }} />
            )}
            {noModels && <span style={{ fontSize: 12, opacity: 0.7 }}>no bg-removal models online</span>}
            {error && <Message type="error" showIcon style={{ flex: 1 }}>{error}</Message>}
        </div>
    );
};

export default RemoveBackgroundButton;
