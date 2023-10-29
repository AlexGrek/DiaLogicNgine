import React, { useState, useEffect } from 'react';
import { Button, ButtonGroup } from 'rsuite';
import { IUpds } from '../../App';
import { GameExecManager } from '../../exec/GameExecutor';
import { createInitialState, State } from '../../exec/GameState';
import { GameDescription } from '../../game/GameDescription';
import GameUiWidgetDisplay from './GameUiWidgetDisplay';
import "./player.css"
import StateDsiplayDrawer from './StateDisplayDrawer';
import StateDisplayDrawer from './StateDisplayDrawer';
import { trace } from '../../Trace';
import PlayerCore from './PlayerCore';

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
        if (visible) {
            // do not do this when the tab is not visible for optimization
            trace("GameExecutor updated")
            setGameExecutor(new GameExecManager(game));
        }
    }, [game, visible]);

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
            <StateDisplayDrawer state={gameState} onClose={() => setStateEditorOpen(false)} open={stateEditorOpen}/>
        </div>
    );
};

export default Player;
