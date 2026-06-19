import React, { useCallback, useEffect, useState } from 'react';
import { Button, ButtonGroup } from 'rsuite';
import { IUpds } from '../../App';
import { trace } from '../../Trace';
import { GameExecManager } from '../../exec/GameExecutor';
import { State, createInitialState } from '../../exec/GameState';
import { GameDescription } from '../../game/GameDescription';
import MainMenuView from './MainMenuView';
import PlayerCore from './PlayerCore';
import StateDisplayDrawer from './StateDisplayDrawer';
import GoToPickerDrawer from './GoToPickerDrawer';
import { playerVisualsCssVars, resolveVisuals } from './visualsClasses';
import lodash from 'lodash';
import "./player.css";

interface PlayerProps {
    game: GameDescription;
    handlers?: IUpds;
    playOnly?: boolean;
    onExit?: () => void;
}

const Player: React.FC<PlayerProps> = ({ game, playOnly, onExit }) => {
    const [, setGame] = useState<GameDescription>(game);
    const [gameExecutor, setGameExecutor] = useState<GameExecManager>(() => new GameExecManager(game));
    const [gameState, setGameState] = useState<State>(() => gameExecutor.executeEntry(createInitialState(game)))
    const [stateEditorOpen, setStateEditorOpen] = useState<boolean>(false)
    const [goToOpen, setGoToOpen] = useState<boolean>(false)
    const [started, setStarted] = useState<boolean>(false)

    useEffect(() => {
        setGame(game);
        trace("GameExecutor updated")
        setGameExecutor(new GameExecManager(game));
        setStarted(false);
        trace(`game updated: ${game.general.description}`)
    }, [game]);

    useEffect(() => {
        const css = game.visuals?.customCss;
        if (!css) return;
        const style = document.createElement('style');
        style.id = 'dialogic-custom-css';
        style.textContent = css;
        document.head.appendChild(style);
        return () => { style.remove(); };
    }, [game.visuals?.customCss]);

    useEffect(() => {
        const css = game.visuals?.inventoryCustomCss;
        if (!css) return;
        const style = document.createElement('style');
        style.id = 'dialogic-inventory-custom-css';
        style.textContent = css;
        document.head.appendChild(style);
        return () => { style.remove(); };
    }, [game.visuals?.inventoryCustomCss]);

    const handleStateChange = (s: State) => {
        setGameState(s)
    }

    const handleRestart = () => {
        setGameState(gameExecutor.executeEntry(createInitialState(game)));
        setStarted(false);
    }

    const handleGoTo = useCallback((target: Parameters<React.ComponentProps<typeof GoToPickerDrawer>['onGoTo']>[0]) => {
        setGameState(prev => {
            const next = lodash.cloneDeep(prev);
            next.positionStack = [];
            if (target.type === 'window') {
                next.position = target.id;
            } else {
                next.position = target.id;
                next.location = target.id.location;
                next.charDialog = null;
            }
            return next;
        });
        setStarted(true);
    }, []);

    const visuals = resolveVisuals(game.visuals);
    const visualsStyle = playerVisualsCssVars(visuals);

    return (
        <div className={`player-window${playOnly ? ' player-window--play-only' : ''}`} style={visualsStyle}>
            {!playOnly && (
                <div className='player-top-panel'>
                    <ButtonGroup className='player-controls'>
                        <Button name='restart' onClick={handleRestart}>Restart</Button>
                        <Button name='statedisplay' onClick={() => setStateEditorOpen(true)}>State</Button>
                        <Button name='goto' onClick={() => setGoToOpen(true)}>Go to</Button>
                    </ButtonGroup>
                </div>
            )}
            <div className="player-main">
                <PlayerCore game={gameExecutor} state={gameState} onStateUpd={handleStateChange} />
                {!started && (
                    <MainMenuView
                        game={game}
                        onStart={() => setStarted(true)}
                        onExit={playOnly ? onExit : undefined}
                    />
                )}
            </div>
            {!playOnly && (
                <>
                    <StateDisplayDrawer state={gameState} game={game} onClose={() => setStateEditorOpen(false)} open={stateEditorOpen} onStateChange={handleStateChange} />
                    <GoToPickerDrawer open={goToOpen} game={game} onClose={() => setGoToOpen(false)} onGoTo={handleGoTo} />
                </>
            )}
        </div>
    );
};

export default Player;
