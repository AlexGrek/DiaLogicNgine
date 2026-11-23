import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GameExecManager } from '../../exec/GameExecutor';
import { InGameNotificationType, State } from '../../exec/GameState';
import { RenderView } from '../../exec/RenderView';
import { styleWithImage } from '../UiUtils';
import { PlayerImagePreloader } from './PlayerImagePreloader';
import { resolveImageProject } from '../common/projectImages';
import { sceneImages, upcomingImages } from '../../exec/Preloader';
import { useProjectImages } from '../common/ProjectImagesContext';
import GameMenuPanel from './GameMenuPanel';
import GameUiWidgetDisplay from './GameUiWidgetDisplay';
import InGameControlPad from './InGameControlPad';
import SavesManager from '../../savegame/LocalStorageSavesManager';
import GameUiElementsView from './GameUiElementsView';
import GameNotificationsView from './GameNotificationsView';
import { PlayerSettings, loadPlayerSettings, savePlayerSettings } from './PlayerSettings';
import { fontScaleForAspectRatio, fontSizeOverrideCssVars, resolveVisuals } from './visualsClasses';

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
    const [frame, setFrame] = React.useState<{
        state: State, view: RenderView, game: GameExecManager, project: string, background: string | null
    } | null>(null)
    const logInput = useRef<HTMLInputElement>(null)
    const preloader = useRef<PlayerImagePreloader | null>(null)
    const lastBackground = useRef<string | null>(null)
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
        const session = new PlayerImagePreloader(storageProject, logInput.current!)
        preloader.current = session
        lastBackground.current = null
        return () => session.dispose()
    }, [game.game, storageProject])

    useEffect(() => {
        const view = game.renderer.render(state, lastBackground.current)
        const background = view.backgroundChange?.nextbg ?? lastBackground.current
        let current = true
        preloader.current!.prepare(sceneImages(background, view.uiWidgetView), upcomingImages(game.game, state)).then(() => {
            if (current) {
                lastBackground.current = background
                setFrame({ state, view, game, project: storageProject, background })
            }
        })
        return () => { current = false }
    }, [game, state, storageProject])

    const onFullScreen = () => { }

    const handleStateUpd = (newState: State) => {
        const now = Date.now()
        if (frame?.state !== state || now - lastAcceptedRef.current < INPUT_LOCK_MS) {
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

    const renderScene = () => {
        if (!frame || frame.game.game !== game.game || frame.project !== storageProject) {
            return <div role="status">Loading scene…</div>
        }
        const { view: currentView, state: displayedState, background } = frame
        const aspectRatio = resolveVisuals(game.game.visuals).aspectRatio;
        const portrait = aspectRatio === '9:16';
        // The player's own size preference is scaled the same way the author's is.
        const fontSizeStyle = fontSizeOverrideCssVars(
            playerSettings.textFontSize,
            playerSettings.responsesFontSize,
            fontScaleForAspectRatio(aspectRatio),
        );
        return (
            <div
                className={`player-core-container${portrait ? ' player-core-container--portrait' : ''}`}
                id='player-core'
                aria-busy={displayedState !== state}
                ref={node => { if (node) node.inert = displayedState !== state }}
                style={fontSizeStyle}
            >
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
                <GameNotificationsView state={displayedState} game={game} onNotificationClick={handleNotificationClick} />
                <div className='player-core-widget-container' id='player-current-widget-host'>
                    <div className="player-top-panel-row">
                        <InGameControlPad onFullscreen={() => onFullScreen()} uiElements={currentView?.uiElements || []}></InGameControlPad>
                        <GameUiElementsView elements={currentView?.uiElements || []}/>
                    </div>
                    <div className='player-core-ingame-menu'>
                        <GameMenuPanel savesManager={savesManager.current} executor={game} game={game.game} state={displayedState} view={currentView} open={menuOpen} widgetRequest={widgetRequest} onOpenClose={handleMenuPanelOpen} onStateChange={handleStateUpd} playerSettings={playerSettings} onPlayerSettingsChange={handlePlayerSettingsChange}/>
                    </div>
                    <motion.div
                        className='player-core-uiwidget-container'
                        animate={{ opacity: menuOpen ? 0 : 1 }}
                        transition={{ duration: 0.2 }}
                        style={menuOpen ? { pointerEvents: 'none' } : undefined}
                    >
                        <GameUiWidgetDisplay view={currentView} game={game} state={displayedState} onStateUpd={handleStateUpd} playerSettings={playerSettings} />
                    </motion.div>
                </div>
            </div>
        )
    }

    return (
        <>
            <input type="hidden" id="player-preloader-log" data-testid="player-preloader-log" ref={logInput} />
            {renderScene()}
        </>
    );
};

export default PlayerCore;
