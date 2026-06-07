import React, { useEffect, useState } from 'react';
import { generateImageUrl } from '../../Utils';
import { GameExecManager } from '../../exec/GameExecutor';
import { HistoryRecord, State } from '../../exec/GameState';
import { DialogRenderView } from '../../exec/RenderView';
import DialogVariants from './DialogVariants';
import { PlayerSettings } from './PlayerSettings';
import { useTypewriterText } from './useTypewriterText';
import TypewriterDialogText from './TypewriterDialogText';
import { dialogWindowViewClass, resolveVisuals } from './visualsClasses';
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
    const visuals = resolveVisuals(game.game.visuals)
    const [inTransitionIn, setInTransitionIn] = useState<boolean>(false)

    useEffect(() => {
        if (visuals.shortHistoryVisible && state.shortHistory.length > 0) {
            const latest = document.getElementById("dialog-short-history-scrollable")
            if (latest) {
                setTimeout(() => {
                    latest.scrollTop = latest.scrollHeight;
                }, 100)

            }
        }

        setInTransitionIn(true)
        setTimeout(() => setInTransitionIn(false), 250)
    }, [view, state.shortHistory.length, visuals.shortHistoryVisible])

    const text = view.text

    const typewriterEnabled = playerSettings.letterByLetter && !state.fatalError

    const typewriterKey = `${step}-${view.pageIndex}-${text}`
    const { displayText, isComplete, skip } = useTypewriterText(
        text,
        typewriterEnabled,
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

    const windowViewClass = dialogWindowViewClass(
        visuals.dialogTextAlignment,
        visuals.shortHistoryVisible ? [] : ['dialog-window-view--no-short-history'],
    )

    const showChoices = !clickToContinue && view.links.length > 0 && !state.fatalError

    return (
        <div className={transitionOutClass(windowViewClass)} onClick={isClickable ? handleAreaClick : undefined} style={isClickable ? { cursor: 'pointer' } : undefined} data-testid="dialog-window-view">
            {visuals.shortHistoryVisible && (
                <div className="dialog-short-history" id="dialog-short-history-scrollable">
                    {renderShortHistory()}
                </div>
            )}
            <div className='dialog-controls'>
                {renderAvatar()}
                <div key={step << 1} className={transitionOutClass('dialog-text')}>
                    {state.fatalError ? (
                        <p className='dialog-current-text' key={step << 1}>
                            {state.fatalError.message}
                        </p>
                    ) : (
                        <TypewriterDialogText
                            fullText={text}
                            displayText={displayText}
                            reserveLayout={typewriterEnabled}
                        />
                    )}
                </div>
                {showChoices && (
                    <DialogVariants
                        game={game}
                        state={state}
                        links={view.links}
                        step={step}
                        onStateUpd={onStateUpd}
                        transitionOut={transitionOut}
                        inTransitionIn={inTransitionIn}
                        text={text}
                        responseAlignment={visuals.responseAlignment}
                        interactive={isComplete}
                    />
                )}
                {clickToContinue && !state.fatalError &&
                    <div className={`dialog-continue-hint${isComplete ? '' : ' dialog-continue-hint--pending'}`} data-testid="dialog-continue-hint">
                        <span className='dialog-continue-chevron'>﹀</span>
                    </div>}
            </div>
        </div>
    );
};

export default DialogWindowView
