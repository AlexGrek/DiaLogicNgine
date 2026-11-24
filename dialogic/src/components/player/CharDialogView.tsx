import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DiscussionTopicType, GameExecManager } from '../../exec/GameExecutor';
import { State } from '../../exec/GameState';
import { LocalizationManager } from '../../exec/Localization';
import { CharDialogRenderView } from '../../exec/RenderView';
import { playAction } from './playerActions';
import DialogVariants from './DialogVariants';
import SpecialDialogVariants from './SpecialDialogVariants';
import DialogTextStage from './DialogTextStage';
import "./player.css";
import DiscussionTopicPicker from './DiscussionTopicPicker';
import { PlayerSettings } from './PlayerSettings';
import { useTypewriterText } from './useTypewriterText';
import { dialogResponsesClass, resolveVisuals } from './visualsClasses';

interface CharDialogViewProps {
    game: GameExecManager
    state: State
    view: CharDialogRenderView
    step: number
    onStateUpd: (newState: State) => void
    playerSettings: PlayerSettings
}

const CharDialogView: React.FC<CharDialogViewProps> = ({ game, state, onStateUpd, view, step, playerSettings }) => {
    const visuals = resolveVisuals(game.game.visuals)
    const showShortHistory = visuals.shortHistoryVisible && playerSettings.shortHistory
    const [discuss, setDiscuss] = useState<boolean>(false)
    const localmanager = useRef<LocalizationManager>(new LocalizationManager(game.game))

    useEffect(() => {
        setDiscuss(false)
    }, [view, state])

    useEffect(() => {
        localmanager.current = new LocalizationManager(game.game)
    }, [game])

    const text = state.fatalError ? state.fatalError.message : view.text
    const typewriterEnabled = playerSettings.letterByLetter && !state.fatalError
    const typewriterKey = `${step}-${view.pageIndex}-${view.text}`
    const { displayText, isComplete, skip } = useTypewriterText(
        view.text,
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
        if (state.fatalError) return
        if (!isComplete) {
            skip()
            return
        }
        if (canAdvance || view.continueLink) {
            playAction(game, state, view, { type: 'continue' }, onStateUpd)
        }
    }

    const handleSpecialDialogClick = (value: string) => {
        if (value === "discuss") {
            setDiscuss(true)
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
    }

    const handleDiscussion = (topicType: DiscussionTopicType, topicValue: string) => {
        playAction(game, state, view, { type: 'discuss', topicType, id: topicValue }, onStateUpd)
    }

    const footer = showOptions ? (
        <div className={dialogResponsesClass(visuals.responseAlignment)}>
            <SpecialDialogVariants game={game} state={state} onClick={handleSpecialDialogClick} links={[discussLink]} responseAlignment={visuals.responseAlignment} nested interactive={isComplete} />
            <DialogVariants game={game} state={state} links={view.links} step={step} onChoose={(link) => playAction(game, state, view, { type: 'link', index: link.index }, onStateUpd)} responseAlignment={visuals.responseAlignment} nested interactive={isComplete} />
        </div>
    ) : clickToContinue && !state.fatalError && isComplete ? (
        <motion.div className="dialog-continue-hint" data-testid="char-dialog-continue-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <motion.span className="dialog-continue-chevron" animate={{ y: [0, 5, 0], opacity: [0.45, 0.9, 0.45] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}>﹀</motion.span>
        </motion.div>
    ) : null

    return (
        <div
            className="dialog-window-view"
            data-testid="char-dialog-view"
            onClick={isClickable ? handleAreaClick : undefined}
            style={isClickable ? { cursor: 'pointer' } : undefined}
        >
            <AnimatePresence mode="wait">
                {discuss ? (
                    <motion.div
                        key="discuss"
                        className="dlg-discuss"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <DiscussionTopicPicker localization={localmanager.current} game={game} state={state} view={view} onCancel={handleCancelSpecialUi} onTopicSelected={handleDiscussion} />
                    </motion.div>
                ) : (
                    <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} style={{ height: '100%' }}>
                        <DialogTextStage
                            morphScope="char"
                            alignment={visuals.dialogTextAlignment}
                            showShortHistory={showShortHistory}
                            shortHistory={state.shortHistory}
                            actor={null}
                            fullText={text}
                            displayText={state.fatalError ? text : displayText}
                            lineKey={typewriterKey}
                            footer={footer}
                            isError={!!state.fatalError}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CharDialogView
