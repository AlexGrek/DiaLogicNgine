import React, { useEffect, useState } from 'react';
import { GameExecManager } from '../../exec/GameExecutor';
import { HistoryRecord, State } from '../../exec/GameState';
import Dialog, { DialogLink, DialogWindow } from '../../game/Dialog';
import "./player.css"

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
        return window.text  // TODO: add text processing logic
    }

    const text = getActualWindowText(state, window)

    const click = (link: DialogLink, textOfLink: string) => {
        setPrevText(text)
        const clickData = { actor: null, text: text, answer: textOfLink, step: state.stepCount } // TODO: add actor
        onStateUpd(game.dialogVariantApply(state, link, clickData))
    }

    const dialogVariants = () => {

        return window.links.map(link => {
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
                <p className='dialog-prev-text' key={state.stepCount}>
                    {prevText}
                </p>
                <p className='dialog-current-text' key={state.stepCount << 1}>
                    {state.fatalError ? state.fatalError.message : window.text}
                </p>
            </div>
            <div className="dialog-variants">
                {state.fatalError ? [] : dialogVariants()}
            </div>
        </div>
    );
};

export default DialogWindowView
