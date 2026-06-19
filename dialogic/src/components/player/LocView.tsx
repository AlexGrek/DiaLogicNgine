import React from 'react';
import { GameExecManager } from '../../exec/GameExecutor';
import { State } from '../../exec/GameState';
import { LocRouteRenderView, LocationRenderView } from '../../exec/RenderView';
import DialogVariants from './DialogVariants';
import DialogTextStage from './DialogTextStage';
import { resolveVisuals } from './visualsClasses';
import "./player.css";
import LocButton from './LocButton';

interface LocViewProps {
    game: GameExecManager;
    state: State;
    view: LocationRenderView
    step: number
    onStateUpd: (newState: State) => void
}

const LocView: React.FC<LocViewProps> = ({ game, state, onStateUpd, view, step }) => {
    const visuals = resolveVisuals(game.game.visuals)
    const text = state.fatalError ? state.fatalError.message : view.text

    const clickRoute = (routeView: LocRouteRenderView) => {
        onStateUpd(game.locRouteApply(state, routeView))
    }

    const footer = view.links.length > 0
        ? <DialogVariants game={game} state={state} links={view.links} step={step} onStateUpd={onStateUpd} responseAlignment={visuals.responseAlignment} />
        : null

    return (
        <div className="dialog-window-view dialog-window-view--location" data-testid="location-view">
            <div className="loc-routes">
                {view.routes.map((route, i) => (
                    <LocButton key={route.index} route={route} onClick={clickRoute} index={i} />
                ))}
            </div>
            <DialogTextStage
                morphScope="loc"
                alignment={visuals.dialogTextAlignment}
                showShortHistory={false}
                shortHistory={[]}
                actor={null}
                fullText={text}
                displayText={text}
                lineKey={`loc-${step}-${view.location.uid}`}
                footer={footer}
                isError={!!state.fatalError}
            />
        </div>
    );
};

export default LocView
