import React, { useState, useEffect } from 'react';
import { IUpds } from '../../App';
import { GameExecManager } from '../../exec/GameExecutor';
import { createInitialState, State } from '../../exec/GameState';
import { GameDescription } from '../../game/GameDescription';
import GameUiWidgetDisplay from './GameUiWidgetDisplay';

interface PlayerProps {
    game: GameDescription;
    handlers: IUpds;
    visible: boolean
}

const Player: React.FC<PlayerProps> = ({ game, visible }) => {
    const [gamedscr, setGame] = useState<GameDescription>(game);
    const [gameExecutor, setGameExecutor] = useState<GameExecManager>(new GameExecManager(game));
    const [gameState, setGameState] = useState<State>(createInitialState(game))

    useEffect(() => {
        setGame(game);
        setGameExecutor(new GameExecManager(game));
    }, [game]);

    const onStateUpd = (s: State) => {
        setGameState(s)
    }

    return !visible ? <p></p> : (
        <div>
            <h1>Player</h1>
            <GameUiWidgetDisplay game={gameExecutor} state={gameState} onStateUpd={onStateUpd}></GameUiWidgetDisplay>
        </div>
    );
};

export default Player;
