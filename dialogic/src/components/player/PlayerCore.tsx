import React, { useEffect } from 'react';
import { Input } from 'rsuite';
import { GameExecManager } from '../../exec/GameExecutor';
import { State } from '../../exec/GameState';
import DialogWindowView from './DialogWindowView';
import LocationView from './LocationView';
import { RenderView } from '../../exec/RenderView';
import GameUiWidgetDisplay from './GameUiWidgetDisplay';
import { styleWithImage } from '../UiUtils';
import InGameControlPad from './InGameControlPad';

interface PlayerCoreProps {
    game: GameExecManager;
    state: State;
    onStateUpd: (newState: State) => void
}

const PlayerCore: React.FC<PlayerCoreProps> = ({ game, state, onStateUpd }) => {
    const [prevView, setPrevView] = React.useState<RenderView | null>(null)
    const [currentView, setCurrentView] = React.useState<RenderView | null>(null)
    const [background, setBackground] = React.useState<string | null>(null)
    const [prevbackground, setPrevbackground] = React.useState<string | null>(null)
    const [inTransitionState, setInTransitionState] = React.useState<boolean>(false)

    useEffect(() => {
        const view = game.render(state, background)
        setPrevView(currentView)
        setCurrentView(view)

        // calculate background change
        if (view.backgroundChange) {
            setPrevbackground(background)
            setBackground(view.backgroundChange.nextbg)
        }

        // start transition animation
        setInTransitionState(true)
        // transition away should be completed
        setTimeout(() => setInTransitionState(false), 200)
    }, [state])

    const onFullScreen = () => {}

    const animation = currentView?.backgroundChange?.effect === 'fast' ? 'fade' : null

    const backgroundContainerStyle = (host: 'old' | 'new', animation: string | null) => {
        const animationClass = animation ? ` ${animation}` : ''
        return `player-bg-host bg-host-${host}${animationClass}`
    }

    const handleStateUpd = (newState: State) => {
        if (inTransitionState) {
            // do nothing if user is trying to change state while transition is happening
            return;
        }
        else {
            onStateUpd(newState)
        }
        
    }

    if (currentView) {

        const viewToRenderNow = (inTransitionState && prevView) ? prevView : currentView

        return (
            <div className='player-core-container' id='player-core'>
                <div key={prevbackground || 'prevbg'} id='player-previous-background-host' className={backgroundContainerStyle('old', animation)} style={styleWithImage(prevbackground)}></div>
                <div key={background || 'bg'} id='player-current-background-host' className={backgroundContainerStyle('new', animation)} style={styleWithImage(background)}></div>
                <div className='player-core-widget-container' id='player-current-widget-host'>
                <div className="dialog-control-pad">
                    <InGameControlPad onFullscreen={() => onFullScreen()}></InGameControlPad>
                </div>
                    <GameUiWidgetDisplay transitionOut={inTransitionState} view={viewToRenderNow} game={game} state={state} onStateUpd={handleStateUpd}/>
                </div>
                
            </div>
        )
    }

    return (
        <div className="game-ui-widget-unknown">
            <h2>No UI widget</h2>
        </div>
    );
};

export default PlayerCore;
