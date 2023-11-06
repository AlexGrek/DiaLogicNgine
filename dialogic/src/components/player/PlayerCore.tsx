import React, { useEffect } from 'react';
import { GameExecManager } from '../../exec/GameExecutor';
import { State } from '../../exec/GameState';
import { RenderView } from '../../exec/RenderView';
import { styleWithImage } from '../UiUtils';
import GameMenuPanel from './GameMenuPanel';
import GameUiWidgetDisplay from './GameUiWidgetDisplay';
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
    const [menuOpen, setMenuOpen] = React.useState<boolean>(false);

    useEffect(() => {
        const view = game.renderer.render(state, background)
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

    const onFullScreen = () => { }

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

    const handleMenuPanelOpen = (open: boolean) => {
        setMenuOpen(open)
    }

    const menuPanelClass = (base: string) => {
        if (!menuOpen) {
            return `${base} menu-close`
        } else {
            return `${base} menu-open`
        }
    }

    const gameWidgetClass = (base: string) => {
        if (menuOpen) {
            return `${base} hiding`
        } else {
            return `${base}`
        }
    }

    if (currentView) {
        const viewToRenderNow = (inTransitionState && prevView) ? prevView : currentView
        return (
            <div className='player-core-container' id='player-core'>
                <div key={prevbackground || 'prevbg'} id='player-previous-background-host' className={backgroundContainerStyle('old', animation)} style={styleWithImage(prevbackground)}></div>
                <div key={background || 'bg'} id='player-current-background-host' className={menuPanelClass(backgroundContainerStyle('new', animation))} style={styleWithImage(background)}></div>
                <div className='player-core-widget-container' id='player-current-widget-host'>
                    <div className="dialog-control-pad">
                        <InGameControlPad onFullscreen={() => onFullScreen()}></InGameControlPad>
                    </div>
                    <div className='player-core-ingame-menu'>
                        <GameMenuPanel executor={game} game={game.game} state={state} view={viewToRenderNow} open={menuOpen} onOpenClose={handleMenuPanelOpen} />
                    </div>
                    <div className={gameWidgetClass('player-core-uiwidget-container')}>
                        <GameUiWidgetDisplay transitionOut={inTransitionState} view={viewToRenderNow} game={game} state={state} onStateUpd={handleStateUpd} />
                    </div>
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
