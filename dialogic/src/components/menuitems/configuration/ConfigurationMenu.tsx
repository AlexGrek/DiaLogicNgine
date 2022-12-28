import React, { useState, useEffect } from 'react';
import { createDialogWindowId } from '../../../exec/GameState';
import { GameDescription } from '../../../game/GameDescription';
import { NotifyCallback } from '../../../UiNotifications';
import DialogWindowPicker from '../../common/DialogWindowPicker';

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

    const onCurrentDialogChange = (d: string | null, w: string | null) => {
        if (d && w) {
            const gameUpdate = {...currentGame, startupDialog: createDialogWindowId(d, w)}
            onSetGame(gameUpdate)
        }
    }

    return (
        <div>
            <h1>Game configuration menu</h1>
            <p>Startup dialog</p>
            <DialogWindowPicker dialogs={currentGame.dialogs} chosen={[currentGame.startupDialog.dialog, currentGame.startupDialog.window]} onValueChange={onCurrentDialogChange}></DialogWindowPicker>
        </div>
    );
};

export default ConfigurationMenu;
