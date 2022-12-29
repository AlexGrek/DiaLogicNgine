import React from 'react';
import { GameExecManager } from '../../exec/GameExecutor';
import { State } from '../../exec/GameState';
import Dialog, { DialogLink, DialogWindow } from '../../game/Dialog';
import "./player.css"

interface DialogWindowViewProps {
    game: GameExecManager;
    state: State;
    dialog: Dialog;
    window: DialogWindow;
    onStateUpd: (newState: State) => void
}

const DialogWindowView: React.FC<DialogWindowViewProps> = ({ game, state, dialog, window, onStateUpd }) => {
    const click = (link: DialogLink) => {
        onStateUpd(game.dialogVariantApply(state, link))
    }

    const dialogVariants = () => {
        return window.links.map(link => {
            return (<div key={link.text}><button onClick={() => click(link)}>{link.text}</button></div>)
        })
    }

    return (
        <div className="dialog-window-view">
            <div className="dialog-text">
                <p>
                    {window.text}
                </p>
            </div>
            <div className="dialog-variants">
                {dialogVariants()}
            </div>
        </div>
    );
};

export default DialogWindowView;
