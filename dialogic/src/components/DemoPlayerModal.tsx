import lodash from 'lodash';
import React, { useEffect, useRef, useState } from 'react';
import { Button, Input, Message, Modal } from 'rsuite';
import { GameExecManager } from '../exec/GameExecutor';
import { State, createInitialState } from '../exec/GameState';
import { GameDescription } from '../game/GameDescription';
import { objectFromYaml } from '../Trace';
import PlayerCore from './player/PlayerCore';
import StateDisplayDrawer from './player/StateDisplayDrawer';
import { playerVisualsCssVars, resolveVisuals } from './player/visualsClasses';
import './player/player.css';

interface DemoPlayerModalProps {
    game: GameDescription;
    open: boolean;
    onClose: () => void;
    initialPatch?: string;
}

const DemoPlayerModal: React.FC<DemoPlayerModalProps> = ({ game, open, onClose, initialPatch }) => {
    const [phase, setPhase] = useState<'edit' | 'play'>('edit');
    const [patchYaml, setPatchYaml] = useState<string>('');
    const [gameState, setGameState] = useState<State | null>(null);
    const [error, setError] = useState<string>('');
    const [stateEditorOpen, setStateEditorOpen] = useState<boolean>(false);
    const executorRef = useRef<GameExecManager | null>(null);

    useEffect(() => {
        if (open) {
            executorRef.current = new GameExecManager(game);
            setPhase('edit');
            setPatchYaml(initialPatch ?? '');
            setError('');
            setGameState(null);
        }
    }, [open, game, initialPatch]);

    const handlePlay = () => {
        try {
            const base = createInitialState(game);
            let patched: State = base;
            const trimmed = patchYaml.trim();
            if (trimmed) {
                const patch = objectFromYaml(trimmed);
                patched = lodash.merge({}, base, patch) as State;
            }
            const withEntry = executorRef.current!.applyEntry(patched);
            setGameState(withEntry);
            setError('');
            setPhase('play');
        } catch (e) {
            setError(`${e}`);
        }
    };

    const handleBack = () => {
        setPhase('edit');
        setGameState(null);
    };

    const visuals = resolveVisuals(game.visuals);
    const visualsStyle = playerVisualsCssVars(visuals);

    return (
        <Modal open={open} onClose={onClose} size="lg" className="demo-player-modal">
            <Modal.Header>
                <Modal.Title>Demo Player</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ padding: phase === 'play' ? 0 : undefined }}>
                {phase === 'edit' && (
                    <div>
                        <p style={{ marginBottom: 8, color: '#666' }}>
                            State patch (YAML). Fields here are deep-merged into the initial state.
                            Leave empty to start from the default initial state.
                        </p>
                        {error && (
                            <Message type="error" showIcon style={{ marginBottom: 8 }}>
                                {error}
                            </Message>
                        )}
                        <Input
                            as="textarea"
                            rows={14}
                            value={patchYaml}
                            onChange={setPatchYaml}
                            style={{ fontFamily: 'monospace', width: '100%' }}
                        />
                    </div>
                )}
                {phase === 'play' && gameState && executorRef.current && (
                    <div
                        className="player-window"
                        style={{ ...visualsStyle, height: '60vh', position: 'relative', overflow: 'hidden' }}
                    >
                        <PlayerCore
                            game={executorRef.current}
                            state={gameState}
                            onStateUpd={setGameState}
                        />
                        <StateDisplayDrawer
                            state={gameState}
                            open={stateEditorOpen}
                            onClose={() => setStateEditorOpen(false)}
                            onStateChange={setGameState}
                        />
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                {phase === 'edit' ? (
                    <Button appearance="primary" onClick={handlePlay}>
                        Play
                    </Button>
                ) : (
                    <>
                        <Button onClick={() => setStateEditorOpen(true)}>State</Button>
                        <Button onClick={handleBack}>Back to Patch</Button>
                    </>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default DemoPlayerModal;
