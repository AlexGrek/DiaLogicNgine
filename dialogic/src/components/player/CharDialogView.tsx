import React, { useEffect, useRef, useState } from 'react';
import { DiscussionTopicType, GameExecManager } from '../../exec/GameExecutor';
import { State } from '../../exec/GameState';
import { LocalizationManager } from '../../exec/Localization';
import { CharDialogRenderView } from '../../exec/RenderView';
import DialogVariants from './DialogVariants';
import SpecialDialogVariants from './SpecialDialogVariants';
import "./player.css";
import DiscussionTopicPicker from './DiscussionTopicPicker';
import { PlayerSettings } from './PlayerSettings';
import { useTypewriterText } from './useTypewriterText';
import TypewriterDialogText from './TypewriterDialogText';
import { dialogResponsesClass, dialogWindowViewClass, resolveVisuals } from './visualsClasses';

interface CharDialogViewProps {
    game: GameExecManager
    state: State
    view: CharDialogRenderView
    step: number
    onStateUpd: (newState: State) => void
    transitionOut: boolean
    playerSettings: PlayerSettings
}

const CharDialogView: React.FC<CharDialogViewProps> = ({ game, state, onStateUpd, view, transitionOut, step, playerSettings }) => {
    const visuals = resolveVisuals(game.game.visuals)
    const [inTransitionIn, setInTransitionIn] = useState<boolean>(false)
    const [inTransitionOut, setInTransitionOut] = useState<boolean>(false)
    const [discuss, setDiscuss] = useState<boolean>(false)
    const localmanager = useRef<LocalizationManager>(new LocalizationManager(game.game))

    useEffect(() => {
        // trace("view changed")
        if (state.shortHistory.length > 0) {
            const latest = document.getElementById("dialog-short-history-scrollable")
            if (latest) {
                setTimeout(() => {
                    latest.scrollTop = latest.scrollHeight;
                }, 100)
            }
        }
        setDiscuss(false)
        setInTransitionIn(true)
        setTimeout(() => setInTransitionIn(false), 250)
    }, [view, state])

    useEffect(() => {
        // trace("transitionOut changed")
        setInTransitionOut(transitionOut)
    }, [transitionOut])

    useEffect(() => {
        // trace("game changed")
        localmanager.current = new LocalizationManager(game.game)
    }, [game])

    const text = view.text

    const typewriterEnabled = playerSettings.letterByLetter && !state.fatalError

    const typewriterKey = `${step}-${view.pageIndex}-${text}`
    const { displayText, isComplete, skip } = useTypewriterText(
        text,
        typewriterEnabled,
        playerSettings.letterByLetterSpeedMs,
        typewriterKey,
    )

    const canAdvance = view.pageIndex < view.pageCount - 1
    const canContinue = view.continueLink != null
    const clickToContinue = canAdvance || canContinue
    const showOptions = !clickToContinue && !state.fatalError
    const isClickable = !state.fatalError && !discuss && (!isComplete || clickToContinue)

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

    const transitionInOutClass = (base: string, index?: number, maxindex?: number) => {
        if (inTransitionOut) {
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
        if (!inTransitionOut) {
            return base
        }
        let indexString = ''
        if (index !== undefined && maxindex) {
            const inumber = index > maxindex ? maxindex : index
            indexString = ` transition-out-${inumber}`
        }
        return `${base} transition-out${indexString}`
    }

    const handleSpecialDialogClick = (value: string) => {
        if (value === "discuss") {
            setTimeout(() => {
                setInTransitionOut(false)
                setDiscuss(true)
            }, 200)
            setInTransitionOut(true)
        }
    }

    const discussLink = {
        name: localmanager.current.local("Discuss..."),
        icon: "w",
        value: "discuss",
        disabled: !(view.dialogOptions.canDiscussChars || view.dialogOptions.canDiscussFacts || view.dialogOptions.canDiscussItems || view.dialogOptions.canDiscussLocations)
    }

    const handleCancelSpecialUi = () => {
        setDiscuss(false)
        setInTransitionOut(false)
        setInTransitionIn(true)
    }

    const handleDiscussion = (topicType: DiscussionTopicType, topicValue: string) => {
        onStateUpd(game.discuss(state, topicType, topicValue, view.char.uid))
    }

    return (
        <div className={transitionOutClass(dialogWindowViewClass(visuals.dialogTextAlignment))} onClick={isClickable ? handleAreaClick : undefined} style={isClickable ? { cursor: 'pointer' } : undefined} data-testid="char-dialog-view">
            <div className={transitionInOutClass('dialog-widget-special-links')}>

            </div>
            {!discuss && <div className='dialog-controls'>
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
                {showOptions && (
                    <div className={dialogResponsesClass(visuals.responseAlignment)}>
                        <SpecialDialogVariants game={game} state={state} onClick={handleSpecialDialogClick} transitionOut={inTransitionOut} inTransitionIn={inTransitionIn} links={[discussLink]} responseAlignment={visuals.responseAlignment} nested interactive={isComplete} />
                        <DialogVariants game={game} state={state} links={view.links} step={step} onStateUpd={onStateUpd} transitionOut={inTransitionOut} inTransitionIn={inTransitionIn} text={text} responseAlignment={visuals.responseAlignment} nested interactive={isComplete} />
                    </div>
                )}
                {clickToContinue && !state.fatalError &&
                    <div className={`dialog-continue-hint${isComplete ? '' : ' dialog-continue-hint--pending'}`} data-testid="char-dialog-continue-hint">
                        <span className='dialog-continue-chevron'>﹀</span>
                    </div>}
            </div>}
            {discuss && <div className='dialog-controls'>
                <DiscussionTopicPicker localization={localmanager.current}  game={game} state={state} view={view} onCancel={handleCancelSpecialUi} onTopicSelected={handleDiscussion}/>
            </div>}
        </div>
    );
};

export default CharDialogView
