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
        <>
            
        </>
    );
};

export default SaveLoadMenu;
