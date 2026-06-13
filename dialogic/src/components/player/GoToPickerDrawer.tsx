import React, { useMemo, useState } from 'react';
import { Button, Drawer, Input, InputGroup, Panel, PanelGroup } from 'rsuite';
import SearchIcon from '@rsuite/icons/Search';
import { GameDescription } from '../../game/GameDescription';
import { DialogWindowId, LocationID } from '../../exec/GameState';

type GoToTarget =
    | { type: 'window'; id: DialogWindowId }
    | { type: 'location'; id: LocationID };

interface GoToPickerDrawerProps {
    open: boolean;
    game: GameDescription;
    onClose: () => void;
    onGoTo: (target: GoToTarget) => void;
}

const GoToPickerDrawer: React.FC<GoToPickerDrawerProps> = ({ open, game, onClose, onGoTo }) => {
    const [filter, setFilter] = useState('');

    const normalizedFilter = filter.trim().toLowerCase();

    const filteredDialogs = useMemo(() => {
        return game.dialogs
            .map(d => ({
                name: d.name,
                windows: d.windows.filter(w =>
                    !normalizedFilter ||
                    d.name.toLowerCase().includes(normalizedFilter) ||
                    w.uid.toLowerCase().includes(normalizedFilter)
                ),
            }))
            .filter(d => d.windows.length > 0);
    }, [game.dialogs, normalizedFilter]);

    const filteredLocs = useMemo(() => {
        if (!normalizedFilter) return game.locs;
        return game.locs.filter(
            l =>
                l.displayName.toLowerCase().includes(normalizedFilter) ||
                l.uid.toLowerCase().includes(normalizedFilter)
        );
    }, [game.locs, normalizedFilter]);

    const handleSelect = (target: GoToTarget) => {
        onGoTo(target);
        onClose();
    };

    return (
        <Drawer open={open} onClose={onClose} size='sm'>
            <Drawer.Header>
                <Drawer.Title>Go to...</Drawer.Title>
                <Drawer.Actions>
                    <Button onClick={onClose}>Close</Button>
                </Drawer.Actions>
            </Drawer.Header>
            <Drawer.Body>
                <InputGroup style={{ marginBottom: 12 }}>
                    <InputGroup.Addon><SearchIcon /></InputGroup.Addon>
                    <Input
                        placeholder="Filter..."
                        value={filter}
                        onChange={setFilter}
                        data-testid="goto-filter"
                    />
                </InputGroup>

                {filteredDialogs.length > 0 && (
                    <>
                        <div style={{ fontWeight: 600, marginBottom: 4, marginLeft: 8 }}>Dialogs</div>
                        <PanelGroup accordion bordered>
                            {filteredDialogs.map(d => (
                                <Panel key={d.name} header={d.name} defaultExpanded={filteredDialogs.length === 1}>
                                    {d.windows.map(w => (
                                        <div
                                            key={w.uid}
                                            style={{ padding: '4px 8px', cursor: 'pointer' }}
                                            className="goto-item"
                                            data-testid={`goto-window-${d.name}-${w.uid}`}
                                            onClick={() =>
                                                handleSelect({
                                                    type: 'window',
                                                    id: { kind: 'window', dialog: d.name, window: w.uid },
                                                })
                                            }
                                        >
                                            {w.uid}
                                        </div>
                                    ))}
                                </Panel>
                            ))}
                        </PanelGroup>
                    </>
                )}

                {filteredLocs.length > 0 && (
                    <>
                        <div style={{ fontWeight: 600, margin: '12px 0 4px 8px' }}>Locations</div>
                        <div style={{ border: '1px solid var(--rs-border-primary)', borderRadius: 6, overflow: 'hidden' }}>
                            {filteredLocs.map((loc, i) => (
                                <div
                                    key={loc.uid}
                                    style={{
                                        padding: '6px 12px',
                                        cursor: 'pointer',
                                        borderTop: i > 0 ? '1px solid var(--rs-border-primary)' : undefined,
                                    }}
                                    className="goto-item"
                                    data-testid={`goto-loc-${loc.uid}`}
                                    onClick={() =>
                                        handleSelect({
                                            type: 'location',
                                            id: { kind: 'location', location: loc.uid },
                                        })
                                    }
                                >
                                    {loc.displayName || loc.uid}
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {filteredDialogs.length === 0 && filteredLocs.length === 0 && (
                    <div style={{ padding: '16px 8px', color: 'var(--rs-text-secondary)' }}>
                        No matches
                    </div>
                )}
            </Drawer.Body>
        </Drawer>
    );
};

export default GoToPickerDrawer;
