import React, { useCallback, useEffect, useState } from 'react';
import {
    Button,
    Divider,
    Input,
    Loader,
    Message,
    Modal,
    SelectPicker,
} from 'rsuite';
import { DialogWindow, createDialogLink, createWindow } from '../../game/Dialog';
import { isValidJsIdentifier } from '../../Utils';

interface LLMWindowStub {
    uid: string;
    text: string;
    links: { text: string; direction: string }[];
}

interface AiGenerateModalProps {
    open: boolean;
    onClose: () => void;
    onApply: (windows: DialogWindow[]) => void;
    existingUids: Set<string>;
}

function buildUniqueUid(base: string, prefix: string, taken: Set<string>): string {
    const candidate = prefix ? `${prefix}_${base}` : base;
    if (!taken.has(candidate)) return candidate;
    let i = 2;
    while (taken.has(`${candidate}_${i}`)) i++;
    return `${candidate}_${i}`;
}

function stubsToDialogWindows(stubs: LLMWindowStub[], prefix: string, existingUids: Set<string>): DialogWindow[] {
    const taken = new Set(existingUids);
    const uidMap = new Map<string, string>();

    for (const stub of stubs) {
        const mapped = buildUniqueUid(stub.uid, prefix, taken);
        taken.add(mapped);
        uidMap.set(stub.uid, mapped);
    }

    return stubs.map((stub) => {
        const win = createWindow(uidMap.get(stub.uid)!);
        win.text.main = stub.text;
        win.links = stub.links.map((l) => {
            const link = createDialogLink();
            link.text = l.text;
            link.mainDirection.direction = uidMap.get(l.direction) ?? l.direction;
            return link;
        });
        return win;
    });
}

const AiGenerateModal: React.FC<AiGenerateModalProps> = ({
    open,
    onClose,
    onApply,
    existingUids,
}) => {
    const [models, setModels] = useState<string[]>([]);
    const [modelsLoading, setModelsLoading] = useState(false);
    const [capability, setCapability] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [uidPrefix, setUidPrefix] = useState('scene');
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchModels = useCallback(async () => {
        setModelsLoading(true);
        setError(null);
        try {
            const r = await fetch('/api/v1/llm/models');
            if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
            const data: string[] = await r.json();
            setModels(data);
            if (data.length > 0 && !capability) setCapability(data[0]);
        } catch (e) {
            setError(`Could not load models: ${e}`);
        } finally {
            setModelsLoading(false);
        }
    }, [capability]);

    useEffect(() => {
        if (open) fetchModels();
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const generate = async () => {
        if (!capability || !prompt.trim()) return;
        setGenerating(true);
        setError(null);
        try {
            const r = await fetch('/api/v1/llm/generate-dialog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ capability, prompt: prompt.trim() }),
            });
            if (!r.ok) {
                const detail = await r.text();
                throw new Error(detail || `${r.status} ${r.statusText}`);
            }
            const stubs: LLMWindowStub[] = await r.json();
            if (!Array.isArray(stubs) || stubs.length === 0) {
                throw new Error('LLM returned no dialog windows');
            }
            const windows = stubsToDialogWindows(stubs, uidPrefix, existingUids);
            onApply(windows);
            onClose();
            setPrompt('');
        } catch (e) {
            setError(`Generation failed: ${e}`);
        } finally {
            setGenerating(false);
        }
    };

    const canGenerate =
        !!capability && prompt.trim().length > 0 && isValidJsIdentifier(uidPrefix) && !generating;

    const modelItems = models.map((m) => ({ label: m, value: m }));

    return (
        <Modal open={open} onClose={onClose} size="sm">
            <Modal.Header>
                <Modal.Title>AI Dialog Generator</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {error && (
                        <Message type="error" closable onClose={() => setError(null)}>
                            {error}
                        </Message>
                    )}

                    <div>
                        <p style={{ marginBottom: 4 }}>Model</p>
                        {modelsLoading ? (
                            <Loader content="Loading models…" />
                        ) : (
                            <SelectPicker
                                data={modelItems}
                                value={capability}
                                onChange={setCapability}
                                cleanable={false}
                                style={{ width: '100%' }}
                                placeholder="Select LLM model"
                            />
                        )}
                    </div>

                    <div>
                        <p style={{ marginBottom: 4 }}>UID prefix</p>
                        <Input
                            value={uidPrefix}
                            onChange={setUidPrefix}
                            placeholder="e.g. shopkeeper"
                        />
                        {uidPrefix && !isValidJsIdentifier(uidPrefix) && (
                            <p style={{ color: 'var(--rs-color-red)', fontSize: 12, marginTop: 4 }}>
                                Must be a valid JS identifier (letters, digits, underscore)
                            </p>
                        )}
                    </div>

                    <Divider style={{ marginTop: 4, marginBottom: 4 }}>Prompt</Divider>

                    <Input
                        as="textarea"
                        rows={6}
                        value={prompt}
                        onChange={setPrompt}
                        placeholder="Describe the scene or conversation to generate…"
                    />

                    {generating && (
                        <div style={{ textAlign: 'center', paddingTop: 8 }}>
                            <Loader size="md" content="Generating dialog…" vertical />
                        </div>
                    )}
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button onClick={generate} appearance="primary" disabled={!canGenerate} loading={generating}>
                    Generate
                </Button>
                <Button onClick={onClose} appearance="subtle">
                    Cancel
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default AiGenerateModal;
