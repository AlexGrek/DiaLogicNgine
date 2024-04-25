import React, { useEffect, useState } from 'react';
import { GameExecManager } from '../../exec/GameExecutor';
import { HistoryRecord, State } from '../../exec/GameState';
import "./player.css"
import Loc from '../../game/Loc';
import { DialogLink } from '../../game/Dialog';

interface LocationViewProps {
    game: GameExecManager;
    state: State;
    location: Loc;
    onStateUpd: (newState: State) => void
}

const LocationView: React.FC<LocationViewProps> = ({ game, state, location, onStateUpd }) => {
    const getActualLinkText = (state: State, link: DialogLink) => {
        return link.text  // TODO: add processing logic
    }

    const getActualWindowText = (state: State, loc: Loc) => {
        return loc.displayName  // TODO: add text processing logic
    }

    const text = getActualWindowText(state, location)

    const click = (link: DialogLink, textOfLink: string) => {
        const clickData = { actor: null, text: text, answer: textOfLink, step: state.stepCount } // TODO: add actor
        onStateUpd(game.dialogVariantApply(state, link, clickData))
    }

    const dialogVariants = () => {

        return location.links.map(link => {
            const textOfLink = getActualLinkText(state, link)
            return (<div key={link.text}><button onClick={() => click(link, textOfLink)}>{textOfLink}</button></div>)
        })
    }

    const renderShortHistoryItem = (item: HistoryRecord, latest: boolean) => {
        // TODO: add actor rendering
        return <div id={latest ? "history-record-latest" : `history-record-${item.step}`} className='dialog-history-record' key={item.step}>
            <p className='dialog-history-record-text'>{item.text}</p>
            <p className='dialog-history-record-ans'>{item.answer}</p>
        </div>
    }

    const renderShortHistory = () => {
        return state.shortHistory.map((item, index) => renderShortHistoryItem(item, index === state.shortHistory.length - 1))
    }

    const styleWithImage = (background?: string) => {
        if (background) {
            return { 
                backgroundImage: `url("game_assets/${background}")`
            }
        }
        else
            return {}
    }

    return (
        <div className="dialog-window-view" style={styleWithImage(state.background)}>
            <div className="dialog-short-history" id="dialog-short-history-scrollable">
                {renderShortHistory()}
            </div>
            <div className="dialog-text">
                <p className='dialog-current-text' key={state.stepCount << 1}>
                    {state.fatalError ? state.fatalError.message : location.displayName}
                </p>
            </div>
            <div className="dialog-variants">
                {state.fatalError ? [] : dialogVariants()}
            </div>
        </div>
    );
};

export default LocationView
