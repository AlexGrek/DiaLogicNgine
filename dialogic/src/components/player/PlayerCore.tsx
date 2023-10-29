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
    const [currentView, setCurrentView] = React.useState<RenderView | null>(null)
    const [background, setBackground] = React.useState<string | null>(null)
    const [prevbackground, setPrevbackground] = React.useState<string | null>(null)

    useEffect(() => {
        const view = game.render(state, background)
        setCurrentView(view)
        if (view.backgroundChange) {
            setPrevbackground(background)
            setBackground(view.backgroundChange.nextbg)
        }
    }, [state])

    const onFullScreen = () => {}

    const animation = currentView?.backgroundChange?.effect === 'fast' ? 'fade' : null

    const backgroundContainerStyle = (host: 'old' | 'new', animation: string | null) => {
        const animationClass = animation ? ` ${animation}` : ''
        return `player-bg-host bg-host-${host}${animationClass}`
    }

    if (currentView) {
        return (
            <div className='player-core-container' id='player-core'>
                <div key={prevbackground} id='player-previous-background-host' className={backgroundContainerStyle('old', animation)} style={styleWithImage(prevbackground)}></div>
                <div key={background} id='player-current-background-host' className={backgroundContainerStyle('new', animation)} style={styleWithImage(background)}></div>
                <div className='player-core-widget-container' id='player-current-widget-host'>
                <div className="dialog-control-pad">
                    <InGameControlPad onFullscreen={() => onFullScreen()}></InGameControlPad>
                </div>
                    <GameUiWidgetDisplay view={currentView} game={game} state={state} onStateUpd={onStateUpd}/>
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
