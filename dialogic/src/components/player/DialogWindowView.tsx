import React from 'react';
import { GameExecManager } from '../../exec/GameExecutor';
import { State } from '../../exec/GameState';
import Dialog, { DialogWindow } from '../../game/Dialog';

interface DialogWindowViewProps {
    game: GameExecManager;
    state: State;
    dialog: Dialog;
    window: DialogWindow;
    onStateUpd: (newState: State) => void
}

const DialogWindowView: React.FC<DialogWindowViewProps> = ({ game, state, dialog, window, onStateUpd }) => {
    return (
        <div className="dialog-text">
            <p>
                {window.text}
            </p>    
        </div>
    );
};

export default DialogWindowView;
