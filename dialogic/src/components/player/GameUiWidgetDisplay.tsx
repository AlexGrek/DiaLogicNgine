import React from 'react';
import { Input } from 'rsuite';
import { GameExecManager } from '../../exec/GameExecutor';
import { State } from '../../exec/GameState';
import { RenderView } from '../../exec/RenderView';
import CharDialogView from './CharDialogView';
import DialogWindowView from './DialogWindowView';
import LocView from './LocView';
import PacView from './PacView';

interface GameUiWidgetDisplayProps {
    game: GameExecManager;
    state: State;
    onStateUpd: (newState: State) => void
    view: RenderView
    transitionOut: boolean
}

const GameUiWidgetDisplay: React.FC<GameUiWidgetDisplayProps> = ({ game, state, onStateUpd, view, transitionOut }) => {

    if (view.uiWidgetView.widget === 'dialog') {
        return (
            <DialogWindowView step={view.step} transitionOut={transitionOut} view={view.uiWidgetView} game={game} state={state} onStateUpd={onStateUpd} />
        )
    }

    if (view.uiWidgetView.widget === 'location') {
        return <LocView step={view.step} transitionOut={transitionOut} view={view.uiWidgetView} game={game} state={state} onStateUpd={onStateUpd} />
    }

    if (view.uiWidgetView.widget === 'char') {
        return <CharDialogView step={view.step} transitionOut={transitionOut} view={view.uiWidgetView} game={game} state={state} onStateUpd={onStateUpd} />
    }

    if (view.uiWidgetView.widget === 'pac') {
        return <PacView step={view.step} transitionOut={transitionOut} view={view.uiWidgetView} game={game} state={state} onStateUpd={onStateUpd} />
    }

    return (
        <div className="game-ui-widget-unknown">
            <h2>Unknown UI widget</h2>
            <Input as="textarea" value={JSON.stringify(state)} readOnly rows={12}></Input>
        </div>
    );
};

export default GameUiWidgetDisplay;
