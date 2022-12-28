import React, { useState, useEffect } from 'react';
import { GameDescription } from '../../../game/GameDescription';
import { NotifyCallback } from '../../../UiNotifications';

interface ConfigurationMenuProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
    onNotify: NotifyCallback;
}

const ConfigurationMenu: React.FC<ConfigurationMenuProps> = ({ game, onSetGame, onNotify }) => {
    const [currentGame, setCurrentGame] = useState<GameDescription>(game);
    useEffect(() => {
        setCurrentGame(game);
    }, [game]);

    return (
        <div>
            <h1>Game configuration menu</h1>
        </div>
    );
};

export default ConfigurationMenu;
