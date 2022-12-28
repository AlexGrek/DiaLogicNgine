import React from 'react';
import { Input } from 'rsuite';
import { GameExecManager } from '../../exec/GameExecutor';
import { State } from '../../exec/GameState';
import DialogWindowView from './DialogWindowView';

interface GameUiWidgetDisplayProps {
    game: GameExecManager;
    state: State;
    onStateUpd: (newState: State) => void
}

const GameUiWidgetDisplay: React.FC<GameUiWidgetDisplayProps> = ({ game, state, onStateUpd }) => {

    const dw = game.getCurrentDialogWindow(state)
    if (dw != null) {
        const [dialog, window] = dw
        return (
            <DialogWindowView game={game} state={state} onStateUpd={onStateUpd} dialog={dialog} window={window}/>
        )
    }

    return (
        <div>
            <h2>Unknown UI widget</h2>
            <Input as="textarea" value={JSON.stringify(state)} readOnly rows={12}></Input>
        </div>
    );
};

export default GameUiWidgetDisplay;
