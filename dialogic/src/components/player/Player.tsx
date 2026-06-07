import React, { useEffect, useState } from 'react';
import { Button, ButtonGroup } from 'rsuite';
import { IUpds } from '../../App';
import { trace } from '../../Trace';
import { GameExecManager } from '../../exec/GameExecutor';
import { State, createInitialState } from '../../exec/GameState';
import { GameDescription } from '../../game/GameDescription';
import MainMenuView from './MainMenuView';
import PlayerCore from './PlayerCore';
import StateDisplayDrawer from './StateDisplayDrawer';
import { playerVisualsCssVars, resolveVisuals } from './visualsClasses';
import "./player.css";

interface PlayerProps {
    game: GameDescription;
    handlers?: IUpds;
}

const Player: React.FC<PlayerProps> = ({ game }) => {
    const [, setGame] = useState<GameDescription>(game);
    const [gameExecutor, setGameExecutor] = useState<GameExecManager>(new GameExecManager(game));
    const [gameState, setGameState] = useState<State>(createInitialState(game))
    const [stateEditorOpen, setStateEditorOpen] = useState<boolean>(false)
    const [started, setStarted] = useState<boolean>(false)

    useEffect(() => {
        setGame(game);
        trace("GameExecutor updated")
        setGameExecutor(new GameExecManager(game));
        setStarted(false);
        trace(`game updated: ${game.general.description}`)
    }, [game]);

    const handleStateChange = (s: State) => {
        setGameState(s)
    }

    const handleRestart = () => {
        setGameState(createInitialState(game));
        setStarted(false);
    }

    const visuals = resolveVisuals(game.visuals);
    const visualsStyle = playerVisualsCssVars(visuals);

    return (
        <div className='player-window' style={visualsStyle}>
            <div className='player-top-panel'>
                <ButtonGroup className='player-controls'>
                    <Button name='restart' onClick={handleRestart}>Restart</Button>
                    <Button name='statedisplay' onClick={() => setStateEditorOpen(true)}>State</Button>
                    <Button name='goto'>Go to</Button>
                </ButtonGroup>
            </div>
            <div className="player-main">
                <PlayerCore game={gameExecutor} state={gameState} onStateUpd={handleStateChange} />
                {!started && (
                    <MainMenuView
                        game={game}
                        onStart={() => setStarted(true)}
                    />
                )}
            </div>
            <StateDisplayDrawer state={gameState} onClose={() => setStateEditorOpen(false)} open={stateEditorOpen} onStateChange={handleStateChange} />
        </div>
    );
};

export default Player;
