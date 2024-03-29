import React, { useEffect, useState } from 'react';
import { Button, ButtonGroup } from 'rsuite';
import { IUpds } from '../../App';
import { trace } from '../../Trace';
import { GameExecManager } from '../../exec/GameExecutor';
import { State, createInitialState } from '../../exec/GameState';
import { GameDescription } from '../../game/GameDescription';
import PlayerCore from './PlayerCore';
import StateDisplayDrawer from './StateDisplayDrawer';
import "./player.css";

interface PlayerProps {
    game: GameDescription;
    handlers?: IUpds;
    visible: boolean
}

const Player: React.FC<PlayerProps> = ({ game, visible }) => {
    const [gamedscr, setGame] = useState<GameDescription>(game);
    const [gameExecutor, setGameExecutor] = useState<GameExecManager>(new GameExecManager(game));
    const [gameState, setGameState] = useState<State>(createInitialState(game))
    const [stateEditorOpen, setStateEditorOpen] = useState<boolean>(false)

    useEffect(() => {
        setGame(game);
        trace("GameExecutor updated")
        setGameExecutor(new GameExecManager(game));
        trace(`game updated: ${game.general.description}`)
    }, [game]);

    const handleStateChange = (s: State) => {
        setGameState(s)
    }

    return !visible ? <p></p> : (
        <div className='player-window'>
            <div className='player-top-panel'>
                <ButtonGroup className='player-controls'>
                    <Button name='restart' onClick={() => setGameState(createInitialState(game))}>Restart</Button>
                    <Button name='statedisplay' onClick={() => setStateEditorOpen(true)}>State</Button>
                    <Button name='goto'>Go to</Button>
                </ButtonGroup>
            </div>
            <div className="player-main">
                <PlayerCore game={gameExecutor} state={gameState} onStateUpd={handleStateChange}></PlayerCore>
            </div>
            <StateDisplayDrawer state={gameState} onClose={() => setStateEditorOpen(false)} open={stateEditorOpen} />
        </div>
    );
};

export default Player;
