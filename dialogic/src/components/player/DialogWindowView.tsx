import React, { useEffect, useState } from 'react';
import { GameExecManager } from '../../exec/GameExecutor';
import { HistoryRecord, State } from '../../exec/GameState';
import Dialog, { DialogLink, DialogWindow } from '../../game/Dialog';
import "./player.css"
import InGameControlPad from './InGameControlPad';
import { styleWithImage } from '../UiUtils';
import { generateImageUrl } from '../../Utils';

interface DialogWindowViewProps {
    game: GameExecManager;
    state: State;
    dialog: Dialog;
    window: DialogWindow;
    onStateUpd: (newState: State) => void
}

const DialogWindowView: React.FC<DialogWindowViewProps> = ({ game, state, dialog, window, onStateUpd }) => {
    const [prevText, setPrevText] = useState<string>("")

    useEffect(() => {
        if (state.shortHistory.length > 0) {
            const latest = document.getElementById("dialog-short-history-scrollable")
            if (latest) {
                setTimeout(() => {
                    latest.scrollTop = latest.scrollHeight;
                    console.log("Scroll to bottom applied")
                }, 100)

            }
        }
    }, [state])

    const getActualLinkText = (state: State, link: DialogLink) => {
        return link.text  // TODO: add processing logic
    }

    const getActualWindowText = (state: State, window: DialogWindow) => {
        return game.getCurrentWindowText(state, window)
    }

    const text = getActualWindowText(state, window)

    const actor = game.getCurrentWindowActor(state, window)

    const renderAvatar = () => {
        if (actor === null) {
            return <div></div>
        } else {
            var image = null;
            if (actor.avatar) {
                image = <img alt={actor.name} src={generateImageUrl(actor.avatar)}></img>
            }
            return <div className='dialog-actor-container'>
                <p>{image}<span className='dialog-actor-name'>{actor.name}</span></p>
            </div>
        }
    }

    const click = (link: DialogLink, textOfLink: string) => {
        setPrevText(text)
        const clickData = { actor: null, text: text, answer: textOfLink, step: state.stepCount } // TODO: add actor
        onStateUpd(game.dialogVariantApply(state, link, clickData))
    }

    const dialogVariants = () => {
        return window.links.map((link, i) => {
            const textOfLink = getActualLinkText(state, link)
            return (<div key={link.text + i} className="dialog-variant-button-container"><button onClick={() => click(link, textOfLink)}>{textOfLink}</button></div>)
        })
    }

    const renderShortHistoryItem = (item: HistoryRecord, latest: boolean, index: number) => {
        // TODO: add actor rendering
        return <div key={index} id={latest ? "history-record-latest" : `history-record-${item.step}`} className='dialog-history-record'>
            <p className='dialog-history-record-text'>{item.text}</p>
            <p className='dialog-history-record-ans'>{item.answer}</p>
        </div>
    }

    const renderShortHistory = () => {
        return state.shortHistory.map((item, index) => renderShortHistoryItem(item, index === state.shortHistory.length - 1, index))
    }

    const onFullScreen = () => {

    }

    return (
        <div className="dialog-window-view-old-bg">
            <div className="dialog-window-view-top-bg" style={styleWithImage(state.background)}>
                <div className="dialog-window-view">
                    <div className="dialog-control-pad">
                        <InGameControlPad onFullscreen={() => onFullScreen()}></InGameControlPad>
                    </div>
                    <div className="dialog-short-history" id="dialog-short-history-scrollable">
                        {renderShortHistory()}
                    </div>
                    <div className='dialog-controls'>
                        {renderAvatar()}
                        <div className="dialog-text">
                           
                            <p className='dialog-prev-text' key={state.stepCount}>
                                {prevText}
                            </p>
                            <p className='dialog-current-text' key={state.stepCount << 1}>
                                {state.fatalError ? state.fatalError.message : text}
                            </p>
                        </div>
                        <div className="dialog-variants">
                            {state.fatalError ? [] : dialogVariants()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DialogWindowView
