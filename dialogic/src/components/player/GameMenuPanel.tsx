import React, { useEffect, useState } from 'react';
import { State } from '../../exec/GameState';
import { RenderView } from '../../exec/RenderView';
import Fact, { createEmptyFact, getFact } from '../../game/Fact';
import { GameDescription } from '../../game/GameDescription';
import LeftTabUiMenuWidget from './LeftTabUiMenuWidget';
import './gamemenupanel.css';


interface GameMenuPanelProps {
    state: State;
    view: RenderView
    open: boolean
    onOpenClose: (open: boolean) => void
    game: GameDescription
}

const GameMenuPanel: React.FC<GameMenuPanelProps> = ({ state, view, open, onOpenClose, game }) => {
    const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
    const [selectedWidgetPrev, setSelectedWidgetPrev] = useState<string | null>(null);
    useEffect(() => {
        setSelectedWidgetPrev(selectedWidget)
        setSelectedWidget(null)
    }, [open]);

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
        return <p className='ui-widget-fact-renderer'>{f.full}</p>
    }

    const getFactsView = () => {
        return [{
            group: "Facts",
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
    }

    const renderWidgetButton = (name: string) => {
        const classBaseName = 'game-menu-sub-button'
        const className = selectedWidget === name ? `${classBaseName} open` : classBaseName
        return <button className={className} onClick={() => handleWidgetClick(name)}>{name}</button>
    }

    return (
        <div className={getClass('game-menu-container')}>
            <div className='game-menu-top'>
                <div className={getClass('game-menu-widget-container')}>
                    {('Facts' === selectedWidget || 'Facts' === selectedWidgetPrev) && <div className={getClassWidget('game-menu-widget', 'Facts')}>
                        <LeftTabUiMenuWidget data={getFactsView()} detailsRenderer={renderFactDetails} />
                    </div>}
                </div>
            </div>
            <div className='game-menu-bottom'>
                <div className={getClass('game-menu-screen')}>
                    <div className={getClass('game-menu-button-group')}>
                        {renderWidgetButton("Inventory")}
                        {renderWidgetButton("Facts")}
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
