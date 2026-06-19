import React from 'react';
import { motion } from 'framer-motion';
import { GameExecManager } from '../../exec/GameExecutor';
import { State } from '../../exec/GameState';
import { DialogRenderView } from '../../exec/RenderView';
import DialogVariants from './DialogVariants';
import DialogTextStage, { StageActor } from './DialogTextStage';
import { PlayerSettings } from './PlayerSettings';
import { useTypewriterText } from './useTypewriterText';
import { resolveVisuals } from './visualsClasses';
import "./player.css";

interface DialogWindowViewProps {
    game: GameExecManager;
    state: State;
    view: DialogRenderView
    step: number
    onStateUpd: (newState: State) => void
    playerSettings: PlayerSettings
}

const DialogWindowView: React.FC<DialogWindowViewProps> = ({ game, state, onStateUpd, view, step, playerSettings }) => {
    const visuals = resolveVisuals(game.game.visuals)
    const showShortHistory = visuals.shortHistoryVisible && playerSettings.shortHistory

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
    const isClickable = !state.fatalError && (!isComplete || clickToContinue)
    const showChoices = !clickToContinue && view.links.length > 0 && !state.fatalError

    const handleAreaClick = () => {
        if (state.fatalError) return
        if (!isComplete) {
            skip()
            return
        }
        if (canAdvance) {
            onStateUpd(game.advanceDialogPage(state, view.text))
        } else if (view.continueLink) {
            const link = view.continueLink
            const clickData = { actor: null, text: view.text, answer: link.text, step }
            onStateUpd(game.dialogVariantApply(state, link.link, clickData))
        }
    }

    const actor: StageActor | null = view.actor ? { name: view.actor.name, avatar: view.actor.avatar } : null

    const footer = (
        <>
            {showChoices && (
                <DialogVariants
                    game={game}
                    state={state}
                    links={view.links}
                    step={step}
                    onStateUpd={onStateUpd}
                    text={view.text}
                    responseAlignment={visuals.responseAlignment}
                    interactive={isComplete}
                />
            )}
            {clickToContinue && !state.fatalError && isComplete && (
                <motion.div
                    className="dialog-continue-hint"
                    data-testid="dialog-continue-hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <motion.span
                        className="dialog-continue-chevron"
                        animate={{ y: [0, 5, 0], opacity: [0.45, 0.9, 0.45] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        ﹀
                    </motion.span>
                </motion.div>
            )}
        </>
    )

    return (
        <div className="dialog-window-view" data-testid="dialog-window-view">
            <DialogTextStage
                morphScope="dialog"
                alignment={visuals.dialogTextAlignment}
                showShortHistory={showShortHistory}
                shortHistory={state.shortHistory}
                actor={actor}
                fullText={text}
                displayText={state.fatalError ? text : displayText}
                lineKey={typewriterKey}
                footer={footer}
                onClick={handleAreaClick}
                clickable={isClickable}
                isError={!!state.fatalError}
            />
        </div>
    );
};

export default DialogWindowView
