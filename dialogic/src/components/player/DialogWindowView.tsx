import React, { useEffect, useState } from 'react';
import { GameExecManager } from '../../exec/GameExecutor';
import { HistoryRecord, State } from '../../exec/GameState';
import Dialog, { DialogLink, DialogWindow } from '../../game/Dialog';
import "./player.css"
import InGameControlPad from './InGameControlPad';
import { styleWithImage } from '../UiUtils';
import { generateImageUrl } from '../../Utils';
import { DialogRenderView } from '../../exec/RenderView';

interface DialogWindowViewProps {
    game: GameExecManager;
    state: State;
    view: DialogRenderView
    step: number
    onStateUpd: (newState: State) => void
    transitionOut: boolean
}

const DialogWindowView: React.FC<DialogWindowViewProps> = ({ game, state, onStateUpd, view, transitionOut, step }) => {
    const [prevText, setPrevText] = useState<string>("")
    const [inTransitionIn, setInTransitionIn] = useState<boolean>(false)

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

        setInTransitionIn(true)
        setTimeout(() => setInTransitionIn(false), 250)
    }, [view])

    const text = view.text

    const actor = view.actor

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

    const transitionInOutClass = (base: string, index?: number, maxindex?: number) => {
        if (transitionOut) {
            return transitionOutClass(base, index, maxindex)
        }
        if (!inTransitionIn)
            return base

        // we are in transition in, so...
        let indexString = ''
        if (index !== undefined && maxindex) {
            const inumber = index > maxindex ? maxindex : index
            indexString = ` transition-in-${inumber}`
        }
        return `${base} transition-in${indexString}`
    }

    const transitionOutClass = (base: string, index?: number, maxindex?: number) => {
        if (!transitionOut) {
            return base
        }
        let indexString = ''
        if (index !== undefined && maxindex) {
            const inumber = index > maxindex ? maxindex : index
            indexString = ` transition-out-${inumber}`
        }
        return `${base} transition-out${indexString}`
    }

    const click = (link: DialogLink, textOfLink: string) => {
        setPrevText(text)
        const clickData = { actor: null, text: text, answer: textOfLink, step: step } // TODO: add actor
        onStateUpd(game.dialogVariantApply(state, link, clickData))
    }

    const dialogVariants = () => {
        return view.links.map((link, i) => {
            const textOfLink = link.text
            return (<div key={link.text + i} className={transitionInOutClass("dialog-variant-button-container")}>
                <button disabled={link.disabled} onClick={() => click(link.link, textOfLink)}>{textOfLink}</button>
            </div>)
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
        <div className={transitionOutClass("dialog-window-view")}>
            <div className="dialog-short-history" id="dialog-short-history-scrollable">
                {renderShortHistory()}
            </div>
            <div className='dialog-controls'>
                {renderAvatar()}
                <div key={step << 1} className={transitionOutClass("dialog-text")}>
                    {/* <p className='dialog-prev-text' key={state.stepCount}>
                            {prevText}
                        </p> */}
                    <p className='dialog-current-text' key={step << 1}>
                        {state.fatalError ? state.fatalError.message : text}
                    </p>
                </div>
                <div className="dialog-variants">
                    {state.fatalError ? [] : dialogVariants()}
                </div>
            </div>
        </div>
    );
};

export default DialogWindowView
