import React, { useState, useEffect } from 'react';
import { GameDescription } from '../../game/GameDescription';

interface SaveLoadMenuProps {
    currentGame: GameDescription;
}

const SaveLoadMenu: React.FC<SaveLoadMenuProps> = ({ currentGame }) => {
    const [game, setGame] = useState<GameDescription>(currentGame);
    const [name, setName] = useState<string>("");

    useEffect(() => {
        setGame(currentGame);
    }, [currentGame]);

    return (
        <div>
            <h1>Save/Load menu</h1>
            <p>Name: {name}</p>
            <p>Game: <code>{JSON.stringify(game)}</code></p>
            <p>endgame.</p>
        </div>
    );
};

export default SaveLoadMenu;
