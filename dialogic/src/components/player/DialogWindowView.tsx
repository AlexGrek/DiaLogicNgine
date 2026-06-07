import React, { useEffect, useState } from 'react';
import { generateImageUrl } from '../../Utils';
import { GameExecManager } from '../../exec/GameExecutor';
import { HistoryRecord, State } from '../../exec/GameState';
import { DialogRenderView } from '../../exec/RenderView';
import DialogVariants from './DialogVariants';
import { PlayerSettings } from './PlayerSettings';
import { useTypewriterText } from './useTypewriterText';
import "./player.css";

interface DialogWindowViewProps {
    game: GameExecManager;
    state: State;
    view: DialogRenderView
    step: number
    onStateUpd: (newState: State) => void
    transitionOut: boolean
    playerSettings: PlayerSettings
}

const DialogWindowView: React.FC<DialogWindowViewProps> = ({ game, state, onStateUpd, view, transitionOut, step, playerSettings }) => {
    const [inTransitionIn, setInTransitionIn] = useState<boolean>(false)

    useEffect(() => {
        if (state.shortHistory.length > 0) {
            const latest = document.getElementById("dialog-short-history-scrollable")
            if (latest) {
                setTimeout(() => {
                    latest.scrollTop = latest.scrollHeight;
                }, 100)

            }
        }

        setInTransitionIn(true)
        setTimeout(() => setInTransitionIn(false), 250)
    }, [view, state.shortHistory.length])

    const text = view.text

    const typewriterKey = `${step}-${view.pageIndex}-${text}`
    const { displayText, isComplete, skip } = useTypewriterText(
        text,
        playerSettings.letterByLetter && !state.fatalError,
        playerSettings.letterByLetterSpeedMs,
        typewriterKey,
    )

    const actor = view.actor

    const canAdvance = view.pageIndex < view.pageCount - 1
    const canContinue = view.continueLink != null
    const clickToContinue = canAdvance || canContinue
    const isClickable = !state.fatalError && (!isComplete || clickToContinue)

    const handleAreaClick = () => {
        if (state.fatalError) {
            return
        }
        if (!isComplete) {
            skip()
            return
        }
        if (canAdvance) {
            onStateUpd(game.advanceDialogPage(state, text))
        } else if (view.continueLink) {
            const link = view.continueLink
            const clickData = { actor: null, text: text, answer: link.text, step: step }
            onStateUpd(game.dialogVariantApply(state, link.link, clickData))
        }
    }

    const renderAvatar = () => {
        if (actor === null) {
            return <div></div>
        } else {
            let image = null;
            if (actor.avatar) {
                image = <img alt={actor.name} src={generateImageUrl(actor.avatar)}></img>
            }
            return <div className='dialog-actor-container'>
                <p>{image}<span className='dialog-actor-name'>{actor.name}</span></p>
            </div>
        }
    }

    // const transitionInOutClass = (base: string, index?: number, maxindex?: number) => {
    //     if (transitionOut) {
    //         return transitionOutClass(base, index, maxindex)
    //     }
    //     if (!inTransitionIn)
    //         return base

    //     // we are in transition in, so...
    //     let indexString = ''
    //     if (index !== undefined && maxindex) {
    //         const inumber = index > maxindex ? maxindex : index
    //         indexString = ` transition-in-${inumber}`
    //     }
    //     return `${base} transition-in${indexString}`
    // }

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

    // const click = (link: DialogLink, textOfLink: string) => {
    //     const clickData = { actor: null, text: text, answer: textOfLink, step: step } // TODO: add actor
    //     onStateUpd(game.dialogVariantApply(state, link, clickData))
    // }

    const renderShortHistoryItem = (item: HistoryRecord, latest: boolean, index: number) => {
        return <div key={index} id={latest ? "history-record-latest" : `history-record-${item.step}`} className='dialog-history-record'>
            <p className='dialog-history-record-text'>{item.text}</p>
            <p className='dialog-history-record-ans'>{item.answer}</p>
        </div>
    }

    const renderShortHistory = () => {
        return state.shortHistory.map((item, index) => renderShortHistoryItem(item, index === state.shortHistory.length - 1, index))
    }

    return (
        <div className={transitionOutClass("dialog-window-view")} onClick={isClickable ? handleAreaClick : undefined} style={isClickable ? { cursor: 'pointer' } : undefined} data-testid="dialog-window-view">
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
                        {state.fatalError ? state.fatalError.message : displayText}
                    </p>
                </div>
                {isComplete && <DialogVariants game={game} state={state} links={view.links} step={step} onStateUpd={onStateUpd} transitionOut={transitionOut} inTransitionIn={inTransitionIn} text={text} />}
                {clickToContinue && isComplete && !state.fatalError &&
                    <div className='dialog-continue-hint' data-testid="dialog-continue-hint">
                        <span className='dialog-continue-chevron'>﹀</span>
                    </div>}
            </div>
        </div>
    );
};

export default DialogWindowView
