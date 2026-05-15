import React, { forwardRef, useCallback, useState } from 'react';
import { Button, Input, Loader, Message, SelectPicker } from 'rsuite';
import CreativeIcon from '@rsuite/icons/Creative';

interface LlmTextareaProps {
    value: string;
    onChange: (value: string) => void;
    rows?: number;
    placeholder?: string;
    className?: string;
    style?: React.CSSProperties;
}

const LlmTextarea = forwardRef<HTMLTextAreaElement, LlmTextareaProps>(
    ({ value, onChange, rows = 5, placeholder, className, style }, ref) => {
        const [aiOpen, setAiOpen] = useState(false);
        const [models, setModels] = useState<string[]>([]);
        const [modelsLoading, setModelsLoading] = useState(false);
        const [capability, setCapability] = useState<string | null>(null);
        const [prompt, setPrompt] = useState('');
        const [generating, setGenerating] = useState(false);
        const [error, setError] = useState<string | null>(null);

        const activateAi = useCallback(async () => {
            setAiOpen(true);
            if (models.length === 0 && !modelsLoading) {
                setModelsLoading(true);
                try {
                    const r = await fetch('/api/v1/llm/models');
                    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
                    const data: string[] = await r.json();
                    setModels(data);
                    if (data.length > 0) setCapability(data[0]);
                } catch (e) {
                    setError(`Could not load models: ${e}`);
                } finally {
                    setModelsLoading(false);
                }
            }
        }, [models.length, modelsLoading]);

        const generate = useCallback(async () => {
            if (!capability || !prompt.trim()) return;
            setGenerating(true);
            setError(null);
            try {
                const r = await fetch('/api/v1/llm/generate-text', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ capability, prompt: prompt.trim() }),
                });
                if (!r.ok) throw new Error(await r.text());
                const data: { text: string } = await r.json();
                onChange(data.text);
                setAiOpen(false);
                setPrompt('');
            } catch (e) {
                setError(`Generation failed: ${e}`);
            } finally {
                setGenerating(false);
            }
        }, [capability, prompt, onChange]);

        const cancel = useCallback(() => {
            setAiOpen(false);
            setError(null);
            setPrompt('');
        }, []);

        const modelItems = models.map((m) => ({ label: m, value: m }));

        return (
            <div style={{ position: 'relative' }}>
                <Input
                    as="textarea"
                    value={value}
                    onChange={onChange}
                    rows={aiOpen ? 1 : rows}
                    placeholder={placeholder}
                    className={className}
                    style={style}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ref={ref as any}
                />
                <button
                    title="Generate with AI"
                    onClick={activateAi}
                    style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        zIndex: 2,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 2,
                        lineHeight: 0,
                        opacity: aiOpen ? 1 : 0.4,
                        transition: 'opacity 0.15s',
                        color: 'var(--rs-blue-500)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = aiOpen ? '1' : '0.4'; }}
                >
                    <CreativeIcon style={{ fontSize: 16 }} />
                </button>
                {aiOpen && (
                    <div style={{
                        marginTop: 4,
                        border: '1px solid var(--rs-border-secondary)',
                        borderRadius: 6,
                        padding: '10px 12px',
                        background: 'var(--rs-body)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                    }}>
                        {error && (
                            <Message type="error" closable onClose={() => setError(null)}>
                                {error}
                            </Message>
                        )}
                        {modelsLoading ? (
                            <Loader content="Loading models…" />
                        ) : (
                            <SelectPicker
                                data={modelItems}
                                value={capability}
                                onChange={setCapability}
                                cleanable={false}
                                size="sm"
                                style={{ width: '100%' }}
                                placeholder="Select LLM model"
                            />
                        )}
                        <Input
                            as="textarea"
                            rows={3}
                            value={prompt}
                            onChange={setPrompt}
                            placeholder="Describe what to generate…"
                        />
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <Button
                                size="sm"
                                appearance="primary"
                                onClick={generate}
                                disabled={!capability || !prompt.trim() || generating}
                                loading={generating}
                            >
                                Generate
                            </Button>
                            <Button size="sm" appearance="subtle" onClick={cancel}>
                                Cancel
                            </Button>
                            {generating && <Loader size="sm" />}
                        </div>
                    </div>
                )}
            </div>
        );
    }
);

LlmTextarea.displayName = 'LlmTextarea';

export default LlmTextarea;
