import React, { useRef, useState } from 'react';
import { Edit2, PlusCircle, Trash2Icon } from "lucide-react";
import { Button, ButtonGroup, Drawer, Input, InputNumber, Panel } from "rsuite";
import { PointAndClick, PointAndClickZone } from "../../../game/PointAndClick";

type EditorMode = 'add' | 'edit';

interface DragState {
    isDragging: boolean;
    zoneId: string | null;
    startX: number;
    startY: number;
    originalX: number;
    originalY: number;
}

interface PointAndClickEditorProps {
    value: PointAndClick, onChange: (it: PointAndClick) => void
}

const PointAndClickEditor: React.FC<PointAndClickEditorProps> = ({ value, onChange }) => {
    const [mode, setMode] = useState<EditorMode>('edit');
    const [selectedZone, setSelectedZone] = useState<PointAndClickZone | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
    const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);

    const handleSetScene = React.useCallback((upd: PointAndClick) => onChange(upd), [onChange])

    const [dragState, setDragState] = useState<DragState>({
        isDragging: false,
        zoneId: null,
        startX: 0,
        startY: 0,
        originalX: 0,
        originalY: 0,
    });

    const scene = value

    const canvasRef = useRef<HTMLDivElement>(null);

    const getRelativePosition = (e: React.MouseEvent): { x: number; y: number } => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100,
        };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (mode === 'add') {
            const pos = getRelativePosition(e);
            setIsDrawing(true);
            setDrawStart(pos);
            setDrawCurrent(pos);
        } else if (mode === 'edit') {
            const pos = getRelativePosition(e);
            const clickedZone = scene.zones.find(z =>
                pos.x >= z.x && pos.x <= z.x + z.width &&
                pos.y >= z.y && pos.y <= z.y + z.height
            );

            if (clickedZone) {
                setDragState({
                    isDragging: true,
                    zoneId: clickedZone.id,
                    startX: pos.x,
                    startY: pos.y,
                    originalX: clickedZone.x,
                    originalY: clickedZone.y,
                });
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (mode === 'add' && isDrawing) {
            const pos = getRelativePosition(e);
            setDrawCurrent(pos);
        } else if (mode === 'edit' && dragState.isDragging && dragState.zoneId) {
            const pos = getRelativePosition(e);
            const deltaX = pos.x - dragState.startX;
            const deltaY = pos.y - dragState.startY;

            handleSetScene({
                ...value,
                zones: value.zones.map(z =>
                    z.id === dragState.zoneId
                        ? { ...z, x: dragState.originalX + deltaX, y: dragState.originalY + deltaY }
                        : z
                ),
            });
        }
    };

    const handleMouseUp = () => {
        if (mode === 'add' && isDrawing && drawStart && drawCurrent) {
            const x = Math.min(drawStart.x, drawCurrent.x);
            const y = Math.min(drawStart.y, drawCurrent.y);
            const width = Math.abs(drawCurrent.x - drawStart.x);
            const height = Math.abs(drawCurrent.y - drawStart.y);

            if (width > 1 && height > 1) {
                const newZone: PointAndClickZone = {
                    id: `zone-${Date.now()}`,
                    name: `Zone ${scene.zones.length + 1}`,
                    x: Math.max(0, Math.min(100 - width, x)),
                    y: Math.max(0, Math.min(100 - height, y)),
                    width: Math.min(width, 100),
                    height: Math.min(height, 100),
                    idleOpacity: 0.3,
                    hoverOpacity: 0.8,
                };

                handleSetScene({ ...value, zones: [...value.zones, newZone] });
            }

            setIsDrawing(false);
            setDrawStart(null);
            setDrawCurrent(null);
        } else if (mode === 'edit' && dragState.isDragging) {
            setDragState({
                isDragging: false,
                zoneId: null,
                startX: 0,
                startY: 0,
                originalX: 0,
                originalY: 0,
            });
        }
    };

    const handleZoneClick = (zone: PointAndClickZone, e: React.MouseEvent) => {
        if (mode === 'edit' && !dragState.isDragging) {
            e.stopPropagation();
            setSelectedZone(zone);
            setDrawerOpen(true);
        }
    };

    const updateSelectedZone = (updates: Partial<PointAndClickZone>) => {
        if (!selectedZone) return;

        handleSetScene({
            ...value,
            zones: value.zones.map(z =>
                z.id === selectedZone.id ? { ...z, ...updates } : z
            ),
        });

        setSelectedZone(prev => prev ? { ...prev, ...updates } : null);
    };

    const deleteZone = () => {
        if (!selectedZone) return;

        handleSetScene({
            ...value,
            zones: value.zones.filter(z => z.id !== selectedZone.id),
        });

        setSelectedZone(null);
        setDrawerOpen(false);
    };

    const getDrawingRect = () => {
        if (!drawStart || !drawCurrent) return null;

        const x = Math.min(drawStart.x, drawCurrent.x);
        const y = Math.min(drawStart.y, drawCurrent.y);
        const width = Math.abs(drawCurrent.x - drawStart.x);
        const height = Math.abs(drawCurrent.y - drawStart.y);

        return { x, y, width, height };
    };

    return (
        <div style={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
            <Panel bordered style={{ padding: '12px 20px', borderRadius: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <ButtonGroup>
                            <Button
                                appearance={mode === 'edit' ? 'primary' : 'default'}
                                onClick={() => setMode('edit')}
                            >
                                <Edit2 /> Edit Mode
                            </Button>
                            <Button
                                appearance={mode === 'add' ? 'primary' : 'default'}
                                onClick={() => setMode('add')}
                            >
                                <PlusCircle /> Add Mode
                            </Button>
                        </ButtonGroup>

                        <span style={{ color: '#666', fontSize: '14px' }}>
                            {mode === 'add' ? 'Draw rectangles to create zones' : 'Click zones to edit, drag to move'}
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', color: '#666' }}>Zones: {scene.zones.length}</span>
                        <Button
                            appearance="ghost"
                            onClick={() => {
                                const json = JSON.stringify(scene, null, 2);
                                console.log(json);
                                alert('Scene JSON logged to console');
                            }}
                        >
                            Export JSON
                        </Button>
                    </div>
                </div>
            </Panel>

            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a', padding: '20px' }}>
                <div style={{ position: 'relative', width: '80%', maxWidth: '800pt', aspectRatio: '16/9', marginBottom: "4em" }}>
                    <div
                        ref={canvasRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            backgroundImage: scene.background ? `url(${scene.background})` : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            cursor: mode === 'add' ? 'crosshair' : 'default',
                            border: '2px solid #333',
                        }}
                    >
                        {scene.zones.map(zone => (
                            <div
                                key={zone.id}
                                onClick={(e) => handleZoneClick(zone, e)}
                                style={{
                                    position: 'absolute',
                                    left: `${zone.x}%`,
                                    top: `${zone.y}%`,
                                    width: `${zone.width}%`,
                                    height: `${zone.height}%`,
                                    border: selectedZone?.id === zone.id ? '3px solid #3498ff' : '2px dashed rgba(52, 152, 255, 0.6)',
                                    backgroundColor: 'rgba(52, 152, 255, 0.2)',
                                    cursor: mode === 'edit' ? 'move' : 'default',
                                    boxSizing: 'border-box',
                                    transition: dragState.zoneId === zone.id ? 'none' : 'border 0.2s',
                                }}
                            >
                                <div style={{
                                    position: 'absolute',
                                    top: '4px',
                                    left: '4px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                    color: '#fff',
                                    padding: '2px 8px',
                                    fontSize: '12px',
                                    borderRadius: '3px',
                                    pointerEvents: 'none',
                                }}>
                                    {zone.name}
                                </div>
                            </div>
                        ))}

                        {isDrawing && mode === 'add' && drawStart && drawCurrent && (() => {
                            const rect = getDrawingRect();
                            return rect ? (
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: `${rect.x}%`,
                                        top: `${rect.y}%`,
                                        width: `${rect.width}%`,
                                        height: `${rect.height}%`,
                                        border: '2px dashed #52c41a',
                                        backgroundColor: 'rgba(82, 196, 26, 0.2)',
                                        pointerEvents: 'none',
                                    }}
                                />
                            ) : null;
                        })()}
                    </div>
                </div>
            </div>

            <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} size="sm">
                <Drawer.Header>
                    <Drawer.Title>Zone Properties</Drawer.Title>
                </Drawer.Header>
                <Drawer.Body>
                    {selectedZone && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Name</label>
                                <Input
                                    value={selectedZone.name}
                                    onChange={(value) => updateSelectedZone({ name: value })}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>ID</label>
                                <Input
                                    value={selectedZone.id}
                                    onChange={(value) => updateSelectedZone({ id: value })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>X (%)</label>
                                    <InputNumber
                                        value={selectedZone.x}
                                        onChange={(value) => updateSelectedZone({ x: Number(value) || 0 })}
                                        step={0.1}
                                        min={0}
                                        max={100}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Y (%)</label>
                                    <InputNumber
                                        value={selectedZone.y}
                                        onChange={(value) => updateSelectedZone({ y: Number(value) || 0 })}
                                        step={0.1}
                                        min={0}
                                        max={100}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Width (%)</label>
                                    <InputNumber
                                        value={selectedZone.width}
                                        onChange={(value) => updateSelectedZone({ width: Number(value) || 0 })}
                                        step={0.1}
                                        min={0}
                                        max={100}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Height (%)</label>
                                    <InputNumber
                                        value={selectedZone.height}
                                        onChange={(value) => updateSelectedZone({ height: Number(value) || 0 })}
                                        step={0.1}
                                        min={0}
                                        max={100}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Image URL</label>
                                <Input
                                    value={selectedZone.image || ''}
                                    onChange={(value) => updateSelectedZone({ image: value || undefined })}
                                    placeholder="Optional zone image"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Idle Opacity</label>
                                    <InputNumber
                                        value={selectedZone.idleOpacity ?? 0.3}
                                        onChange={(value) => updateSelectedZone({ idleOpacity: Number(value) })}
                                        step={0.1}
                                        min={0}
                                        max={1}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Hover Opacity</label>
                                    <InputNumber
                                        value={selectedZone.hoverOpacity ?? 0.8}
                                        onChange={(value) => updateSelectedZone({ hoverOpacity: Number(value) })}
                                        step={0.1}
                                        min={0}
                                        max={1}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Is Disabled If (Script)</label>
                                <Input
                                    as="textarea"
                                    rows={3}
                                    value={selectedZone.isDisabledIfScript || ''}
                                    onChange={(value) => updateSelectedZone({ isDisabledIfScript: value || undefined })}
                                    placeholder="JavaScript expression"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>Is Visible If (Script)</label>
                                <Input
                                    as="textarea"
                                    rows={3}
                                    value={selectedZone.isVisibleIfScript || ''}
                                    onChange={(value) => updateSelectedZone({ isVisibleIfScript: value || undefined })}
                                    placeholder="JavaScript expression"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>On Click Script</label>
                                <Input
                                    as="textarea"
                                    rows={5}
                                    value={selectedZone.onClickScript || ''}
                                    onChange={(value) => updateSelectedZone({ onClickScript: value || undefined })}
                                    placeholder="JavaScript code to execute"
                                />
                            </div>

                            <Button
                                appearance="primary"
                                color="red"
                                block
                                onClick={deleteZone}
                                style={{ marginTop: '20px' }}
                            >
                                <Trash2Icon /> Delete Zone
                            </Button>
                        </div>
                    )}
                </Drawer.Body>
            </Drawer>
        </div>
    );
};

export default PointAndClickEditor;