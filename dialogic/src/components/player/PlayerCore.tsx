import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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

// Brief window after an accepted state change during which further clicks are
// ignored, so a fast double-click cannot skip a step. The typewriter "skip on
// first click" handles the common case; this is just a debounce safety net.
const INPUT_LOCK_MS = 130

const PlayerCore: React.FC<PlayerCoreProps> = ({ game, state, onStateUpd }) => {
    const [currentView, setCurrentView] = React.useState<RenderView | null>(null)
    const [background, setBackground] = React.useState<string | null>(null)
    const [menuOpen, setMenuOpen] = React.useState<boolean>(false);
    const [widgetRequest, setWidgetRequest] = React.useState<{ name: string } | null>(null);
    const [playerSettings, setPlayerSettings] = React.useState<PlayerSettings>(() => {
        const visuals = resolveVisuals(game.game.visuals);
        return loadPlayerSettings({
            letterByLetter: visuals.typewriterEnabled,
            letterByLetterSpeedMs: visuals.typewriterSpeedMs,
            textFontSize: visuals.textFontSize,
            responsesFontSize: visuals.responsesFontSize,
            shortHistory: visuals.shortHistoryVisible,
        });
    });
    const storageProject = resolveImageProject(useProjectImages());
    const lastAcceptedRef = useRef<number>(0)

    const savesManager = useRef<SavesManager>(new SavesManager(game.game.general.name))

    useEffect(() => {
        savesManager.current = new SavesManager(game.game.general.name)
    }, [game.game])

    useEffect(() => {
        const view = game.renderer.render(state, background)
        setCurrentView(view)
        if (view.backgroundChange) {
            setBackground(view.backgroundChange.nextbg)
        }
    // Only re-render view when game state changes; background is read for transition logic.
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

    const handleStateUpd = (newState: State) => {
        const now = Date.now()
        if (now - lastAcceptedRef.current < INPUT_LOCK_MS) {
            return;
        }
        lastAcceptedRef.current = now
        savesManager.current.newAutoSave(newState)
        onStateUpd(newState)
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

    if (currentView) {
        const fontSizeStyle = fontSizeOverrideCssVars(playerSettings.textFontSize, playerSettings.responsesFontSize);
        return (
            <div className='player-core-container' id='player-core' style={fontSizeStyle}>
                <div className={`player-bg-stage${menuOpen ? ' menu-open' : ''}`}>
                    <AnimatePresence>
                        <motion.div
                            key={background || 'bg'}
                            className='player-bg-host'
                            style={styleWithImage(background, storageProject)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8, ease: 'easeInOut' }}
                        />
                    </AnimatePresence>
                </div>
                <GameNotificationsView state={state} game={game} onNotificationClick={handleNotificationClick} />
                <div className='player-core-widget-container' id='player-current-widget-host'>
                    <div className="player-top-panel-row">
                        <InGameControlPad onFullscreen={() => onFullScreen()} uiElements={currentView?.uiElements || []}></InGameControlPad>
                        <GameUiElementsView elements={currentView?.uiElements || []}/>
                    </div>
                    <div className='player-core-ingame-menu'>
                        <GameMenuPanel savesManager={savesManager.current} executor={game} game={game.game} state={state} view={currentView} open={menuOpen} widgetRequest={widgetRequest} onOpenClose={handleMenuPanelOpen} onStateChange={handleStateUpd} playerSettings={playerSettings} onPlayerSettingsChange={handlePlayerSettingsChange}/>
                    </div>
                    <motion.div
                        className='player-core-uiwidget-container'
                        animate={{ opacity: menuOpen ? 0 : 1 }}
                        transition={{ duration: 0.2 }}
                        style={menuOpen ? { pointerEvents: 'none' } : undefined}
                    >
                        <GameUiWidgetDisplay view={currentView} game={game} state={state} onStateUpd={handleStateUpd} playerSettings={playerSettings} />
                    </motion.div>
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
