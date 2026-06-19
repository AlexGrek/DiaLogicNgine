import React from 'react';
import { Input } from 'rsuite';
import { GameExecManager } from '../../exec/GameExecutor';
import { State } from '../../exec/GameState';
import { RenderView } from '../../exec/RenderView';
import CharDialogView from './CharDialogView';
import DialogWindowView from './DialogWindowView';
import LocView from './LocView';
import PacView from './PacView';
import { PlayerSettings } from './PlayerSettings';

interface GameUiWidgetDisplayProps {
    game: GameExecManager;
    state: State;
    onStateUpd: (newState: State) => void
    view: RenderView
    playerSettings: PlayerSettings
}

const GameUiWidgetDisplay: React.FC<GameUiWidgetDisplayProps> = ({ game, state, onStateUpd, view, playerSettings }) => {

    if (view.uiWidgetView.widget === 'dialog') {
        return (
            <DialogWindowView step={view.step} view={view.uiWidgetView} game={game} state={state} onStateUpd={onStateUpd} playerSettings={playerSettings} />
        )
    }

    if (view.uiWidgetView.widget === 'location') {
        return <LocView step={view.step} view={view.uiWidgetView} game={game} state={state} onStateUpd={onStateUpd} />
    }

    if (view.uiWidgetView.widget === 'char') {
        return <CharDialogView step={view.step} view={view.uiWidgetView} game={game} state={state} onStateUpd={onStateUpd} playerSettings={playerSettings} />
    }

    if (view.uiWidgetView.widget === 'pac') {
        return <PacView step={view.step} view={view.uiWidgetView} game={game} state={state} onStateUpd={onStateUpd} />
    }

    if (view.uiWidgetView.widget === 'error') {
        return (
            <div className="game-ui-widget-unknown">
                <h2>Error</h2>
                <p>{view.uiWidgetView.errorText}</p>
            </div>
        );
    }

    return (
        <div className="game-ui-widget-unknown">
            <h2>Unknown UI widget</h2>
            <Input as="textarea" value={JSON.stringify(state)} readOnly rows={12}></Input>
        </div>
    );
};

export default GameUiWidgetDisplay;
