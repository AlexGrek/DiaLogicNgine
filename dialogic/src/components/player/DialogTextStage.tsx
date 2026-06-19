import React, { useLayoutEffect, useRef } from 'react';
import { LayoutGroup, motion } from 'framer-motion';
import { HistoryRecord } from '../../exec/GameState';
import { DialogTextAlignment } from '../../game/GameDescription';
import { generateImageUrl } from '../../Utils';
import { resolveImageProject } from '../common/projectImages';
import { useProjectImages } from '../common/ProjectImagesContext';
import TypewriterDialogText from './TypewriterDialogText';

export interface StageActor {
    name: string;
    avatar?: string | null;
}

interface DialogTextStageProps {
    /** Namespace for layout ids so two stages never share a morph target. */
    morphScope: string;
    alignment: DialogTextAlignment;
    showShortHistory: boolean;
    shortHistory: HistoryRecord[];
    actor: StageActor | null;
    fullText: string;
    displayText: string;
    /** Changes whenever the displayed line changes (step / page / text). */
    lineKey: string;
    /** Footer slot: choices, continue hint, etc. Rendered pinned below the text. */
    footer?: React.ReactNode;
    isError?: boolean;
}

const MORPH_TRANSITION = { type: 'spring' as const, stiffness: 520, damping: 42, mass: 0.7 };

const DialogTextStage: React.FC<DialogTextStageProps> = ({
    morphScope,
    alignment,
    showShortHistory,
    shortHistory,
    actor,
    fullText,
    displayText,
    lineKey,
    footer,
    isError,
}) => {
    const storageProject = resolveImageProject(useProjectImages());
    const scrollRef = useRef<HTMLDivElement>(null);
    const currentRef = useRef<HTMLDivElement>(null);

    // Render-derived monotonic line counter. It increments by exactly one each
    // time the displayed line changes, which lets the newest short-history entry
    // reuse the previous current-line's layout id — that shared id is what makes
    // the current text physically morph up into the history strip on advance.
    const counterRef = useRef<number>(0);
    const lastKeyRef = useRef<string | null>(null);
    if (lastKeyRef.current !== lineKey) {
        lastKeyRef.current = lineKey;
        counterRef.current += 1;
    }
    const lineCounter = counterRef.current;

    const history = showShortHistory ? shortHistory : [];
    const lineId = (index: number) => `${morphScope}-dline-${lineCounter - (history.length - index)}`;

    // When everything fits, show all of it (history above, current below). When it
    // overflows, keep the current line's BEGINNING visible at the top — with a small
    // slice of history peeking above — and let the rest of the line scroll.
    useLayoutEffect(() => {
        const scroller = scrollRef.current;
        const current = currentRef.current;
        if (!scroller || !current) return;
        const HISTORY_PEEK = 40;
        if (scroller.scrollHeight <= scroller.clientHeight) {
            scroller.scrollTop = 0;
        } else {
            scroller.scrollTop = Math.max(0, current.offsetTop - HISTORY_PEEK);
        }
    }, [lineKey, fullText, displayText]);

    const renderAvatar = () => {
        if (!actor) return null;
        return (
            <div className="dlg-actor">
                {actor.avatar && (
                    <img className="dlg-actor-avatar" alt={actor.name} src={generateImageUrl(actor.avatar, storageProject)} />
                )}
                <span className="dlg-actor-name">{actor.name}</span>
            </div>
        );
    };

    return (
        <div className={`dlg-stage dlg-stage--${alignment}`} data-testid="dialog-text-stage">
            <LayoutGroup>
                <div className="dlg-scroll" ref={scrollRef}>
                    {history.length > 0 && (
                        <div className="dlg-history">
                            {history.map((rec, i) => (
                                <div className="dlg-history-rec" key={`${lineId(i)}`}>
                                    <motion.p
                                        layoutId={lineId(i)}
                                        transition={MORPH_TRANSITION}
                                        className="dlg-history-text"
                                    >
                                        {rec.text}
                                    </motion.p>
                                    {rec.answer && (
                                        <motion.p
                                            className="dlg-history-ans"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.35 }}
                                        >
                                            {rec.answer}
                                        </motion.p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="dlg-current" ref={currentRef}>
                        {renderAvatar()}
                        {isError ? (
                            <p className="dlg-line dlg-line--error">{fullText}</p>
                        ) : (
                            <motion.p
                                key={lineId(history.length)}
                                layoutId={lineId(history.length)}
                                transition={MORPH_TRANSITION}
                                className="dlg-line"
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <TypewriterDialogText fullText={fullText} displayText={displayText} />
                            </motion.p>
                        )}
                    </div>
                </div>
            </LayoutGroup>
            {footer && <div className="dlg-footer">{footer}</div>}
        </div>
    );
};

export default DialogTextStage;
