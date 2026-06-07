import React, { useEffect, useRef } from 'react';
import { GameExecManager } from '../../exec/GameExecutor';
import { InGameNotificationType, State } from '../../exec/GameState';
import { RenderView } from '../../exec/RenderView';
import { styleWithImage } from '../UiUtils';
import { generateImageUrl } from '../../Utils';
import { resolveImageProject } from '../common/projectImages';
import { getListForPrealoading } from '../../exec/Preloader';
import { useProjectImages } from '../common/ProjectImagesContext';
import GameMenuPanel from './GameMenuPanel';
import GameUiWidgetDisplay from './GameUiWidgetDisplay';
import InGameControlPad from './InGameControlPad';
import SavesManager from '../../savegame/LocalStorageSavesManager';
import GameUiElementsView from './GameUiElementsView';
import GameNotificationsView from './GameNotificationsView';
import { PlayerSettings, loadPlayerSettings, savePlayerSettings } from './PlayerSettings';
import { fontSizeOverrideCssVars, resolveVisuals } from './visualsClasses';

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
    const [widgetRequest, setWidgetRequest] = React.useState<{ name: string } | null>(null);
    const [playerSettings, setPlayerSettings] = React.useState<PlayerSettings>(() => {
        const visuals = resolveVisuals(game.game.visuals);
        return loadPlayerSettings({
            letterByLetter: visuals.typewriterEnabled,
            letterByLetterSpeedMs: visuals.typewriterSpeedMs,
            textFontSize: visuals.textFontSize,
            responsesFontSize: visuals.responsesFontSize,
        });
    });
    const storageProject = resolveImageProject(useProjectImages());

    const savesManager = useRef<SavesManager>(new SavesManager(game.game.general.name))

    useEffect(() => {
        savesManager.current = new SavesManager(game.game.general.name)
    }, [game.game])

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
    // Only re-render view when game state changes; background/currentView are read for transition logic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state])

    useEffect(() => {
        getListForPrealoading(game.game, state).forEach(uri => {
            const img = new Image()
            img.src = generateImageUrl(uri, storageProject)
        })
    // storageProject is stable per session; game.game changes only on full reload
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            savesManager.current.newAutoSave(newState)
            onStateUpd(newState)
        }
    }

    const handleMenuPanelOpen = (open: boolean) => {
        setMenuOpen(open)
    }

    const handlePlayerSettingsChange = (next: PlayerSettings) => {
        setPlayerSettings(next)
        savePlayerSettings(next)
    }

    // Map a notification type to the menu widget it should open, then open the menu there.
    const handleNotificationClick = (type: InGameNotificationType) => {
        const widget = (type === 'itemadded' || type === 'itemremoved') ? 'Inventory' : 'Journal'
        setMenuOpen(true)
        // new object each call so the request effect re-fires even for the same widget
        setWidgetRequest({ name: widget })
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
        const fontSizeStyle = fontSizeOverrideCssVars(playerSettings.textFontSize, playerSettings.responsesFontSize);
        return (
            <div className='player-core-container' id='player-core' style={fontSizeStyle}>
                <div key={prevbackground || 'prevbg'} id='player-previous-background-host' className={backgroundContainerStyle('old', animation)} style={styleWithImage(prevbackground, storageProject)}></div>
                <div key={background || 'bg'} id='player-current-background-host' className={menuPanelClass(backgroundContainerStyle('new', animation))} style={styleWithImage(background, storageProject)}></div>
                <GameNotificationsView state={state} game={game} onNotificationClick={handleNotificationClick} />
                <div className='player-core-widget-container' id='player-current-widget-host'>
                    <div className="player-top-panel-row">
                        <InGameControlPad onFullscreen={() => onFullScreen()} uiElements={currentView?.uiElements || []}></InGameControlPad>
                        <GameUiElementsView elements={currentView?.uiElements || []}/>
                    </div>
                    <div className='player-core-ingame-menu'>
                        <GameMenuPanel savesManager={savesManager.current} executor={game} game={game.game} state={state} view={viewToRenderNow} open={menuOpen} widgetRequest={widgetRequest} onOpenClose={handleMenuPanelOpen} onStateChange={handleStateUpd} playerSettings={playerSettings} onPlayerSettingsChange={handlePlayerSettingsChange}/>
                    </div>
                    <div className={gameWidgetClass('player-core-uiwidget-container')}>
                        <GameUiWidgetDisplay transitionOut={inTransitionState} view={viewToRenderNow} game={game} state={state} onStateUpd={handleStateUpd} playerSettings={playerSettings} />
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
