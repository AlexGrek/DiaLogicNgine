import React, { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { GameExecManager } from '../../exec/GameExecutor';
import { State } from '../../exec/GameState';
import { LocalizationManager } from '../../exec/Localization';
import { CharInfoRenderView, RenderView } from '../../exec/RenderView';
import Fact, { createEmptyFact, getFact } from '../../game/Fact';
import { GameDescription } from '../../game/GameDescription';
import LeftTabUiMenuWidget, { DataGroups } from './LeftTabUiMenuWidget';
import TabsUiMenuWidget from './TabsUiMenuWidget';
import './gamemenupanel.css';
import ObjectivesTab from './ObjectivesTab';
import MenuTab from './MenuTab';
import InventoryTab from './InventoryTab';
import SavesManager from '../../savegame/LocalStorageSavesManager';
import { PlayerSettings } from './PlayerSettings';


interface GameMenuPanelProps {
    state: State;
    view: RenderView
    open: boolean
    onOpenClose: (open: boolean) => void
    game: GameDescription
    executor: GameExecManager
    onStateChange: (newstate: State) => void
    savesManager: SavesManager
    widgetRequest?: { name: string } | null
    playerSettings: PlayerSettings
    onPlayerSettingsChange: (s: PlayerSettings) => void
}

const GameMenuPanel: React.FC<GameMenuPanelProps> = ({ state, open, onOpenClose, game, executor, onStateChange, savesManager, widgetRequest, playerSettings, onPlayerSettingsChange }) => {
    const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
    const [selectedWidgetPrev, setSelectedWidgetPrev] = useState<string | null>(null);

    const factsCache = useRef<DataGroups<Fact>>([])
    const charsCache = useRef<DataGroups<CharInfoRenderView>>([])

    const localmanager = useRef<LocalizationManager>(new LocalizationManager(game))

    useEffect(() => {
        setSelectedWidgetPrev(selectedWidget)
        setSelectedWidget(null)
        if (!open) {
            setTimeout(() => {
                setSelectedWidgetPrev(null)
                setSelectedWidget(null)
            }, 250)
        }
    // Only reset widget selection when the menu opens/closes, not when the user picks a tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Open a specific widget on external request (e.g. clicking a notification toast).
    // Declared after the [open] effect so it wins when the menu opens and that
    // effect would otherwise reset the selection to null.
    useEffect(() => {
        if (widgetRequest) {
            setSelectedWidget(widgetRequest.name)
        }
    }, [widgetRequest]);

    const getClass = (base: string) => {
        const addClass = open ? "opening" : "closing"
        return `${base} ${addClass}`
    }

    const getClassWidget = (base: string, widgetName: string) => {
        const addClass = widgetName === selectedWidgetPrev ? `${base} prev` : base
        return `${base} ${addClass}`
    }

    const handleWidgetClick = (name: string) => {
        setSelectedWidgetPrev(selectedWidget)

        if (name === selectedWidget) {
            setSelectedWidget(null)
        } else {
            setSelectedWidget(name)
        }
    }

    const renderFactDetails = (f: Fact) => {
        return <div className='ui-widget-fact-renderer'><Markdown>{f.full}</Markdown></div>
    }

    const renderCharDetails = (d: CharInfoRenderView) => {
        return <div className='ui-widget-char-renderer'>
            <h2>{d.name}</h2>
            <div><Markdown>{d.description}</Markdown></div>
        </div>
    }

    const getFactsView = (): DataGroups<Fact> => {
        if (factsCache.current == null || state.knownFacts.length != factsCache.current.length) {
            // trace("Recreating facts cache for UI")
            const updatedFacts = [{
                group: localmanager.current.local("Facts"),
                items: state.knownFacts.map((factid) => {
                    let realFact = getFact(game, factid)
                    if (realFact == null) {
                        realFact = createEmptyFact('error')
                        realFact.short = `Error fact ${factid}`
                        realFact.full = `Error: fact with uid ${factid} not found in game, looks like it is version mismatch`
                    }
                    return {
                        label: realFact.short,
                        value: realFact.uid,
                        data: realFact
                    }
                })
            }]
            factsCache.current = updatedFacts
            return updatedFacts
        }
        return factsCache.current
    }

    const getCharsView = () => {
        if (charsCache.current == null || state.knownPeople.length != charsCache.current.length) {
            // trace("Recreating facts cache for UI")
            const chars = [{
                group: localmanager.current.local("Known people"),
                items: state.knownPeople.map((charid) => {
                    const descr = executor.renderer.getCharInfoDescription(state, charid)
                    return {
                        label: descr.name,
                        value: charid,
                        data: descr
                    }
                })
            }]
            charsCache.current = chars
            return chars
        }
        return charsCache.current
    }

    const factTabs = () => {
        return [{
            name: localmanager.current.local("Facts"),
            contentRenderer: () => <LeftTabUiMenuWidget data={getFactsView()} detailsRenderer={renderFactDetails} />
        },
        {
            name: localmanager.current.local("People"),
            contentRenderer: () => <LeftTabUiMenuWidget data={getCharsView()} detailsRenderer={renderCharDetails} />
        }
        ]
    }



    const renderWidgetButton = (name: string, label?: string) => {
        const classBaseName = 'game-menu-sub-button'
        const className = selectedWidget === name ? `${classBaseName} open` : classBaseName
        return <button className={className} onClick={() => handleWidgetClick(name)}>{localmanager.current.local(label ?? name)}</button>
    }

    return (
        <div className={getClass('game-menu-container')}>
            <div className='game-menu-top'>
                <div className={getClass('game-menu-widget-container')}>
                    {('Inventory' === selectedWidget || 'Inventory' === selectedWidgetPrev) && <div className={getClassWidget('game-menu-widget', 'Inventory')}>
                        <InventoryTab state={state} game={executor} onUseItem={(uid) => { onOpenClose(false); onStateChange(executor.useItemInDialog(state, uid)); }} />
                    </div>}
                    {('Facts' === selectedWidget || 'Facts' === selectedWidgetPrev) && <div className={getClassWidget('game-menu-widget', 'Facts')}>
                        <TabsUiMenuWidget data={factTabs()} />
                    </div>}
                    {('Journal' === selectedWidget || 'Journal' === selectedWidgetPrev) && <div className={getClassWidget('game-menu-widget', 'Journal')}>
                        <ObjectivesTab gameExecutor={executor} state={state} localmanager={localmanager.current}/>
                    </div>}
                    {('Menu' === selectedWidget || 'Menu' === selectedWidgetPrev) && <div className={getClassWidget('game-menu-widget', 'Menu')}>
                        <MenuTab onCloseMenu={() => onOpenClose(false)} manager={savesManager} gameExecutor={executor} state={state} localmanager={localmanager.current} onStateChange={onStateChange} playerSettings={playerSettings} onPlayerSettingsChange={onPlayerSettingsChange}/>
                    </div>}
                </div>
            </div>
            <div className='game-menu-bottom'>
                <div className={getClass('game-menu-screen')}>
                    <div className={getClass('game-menu-button-group')}>
                        {renderWidgetButton("Inventory")}
                        {renderWidgetButton("Facts", "Knowledge")}
                        {renderWidgetButton("Journal")}
                        {renderWidgetButton("Menu")}
                    </div>
                </div>
                <button onClick={() => onOpenClose(!open)} className={getClass('game-menu-button-main')}>
                    <p className={getClass('game-menu-button-main-toopen')}>- - - -</p>
                    <p className={getClass('game-menu-button-main-toclose')}>&#x37;</p>
                </button>
            </div>
        </div>
    );
};

export default GameMenuPanel;
