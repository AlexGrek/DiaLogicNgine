import React from 'react';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import { GameExecManager } from '../../exec/GameExecutor';
import { State } from '../../exec/GameState';
import { RenderLink } from '../../exec/RenderView';
import { ResponseAlignment } from '../../game/GameDescription';
import { dialogVariantsClass, resolveLinkAppearance, resolveVisuals } from './visualsClasses';
import LinkButtonContent from './LinkButtonContent';
import "./player.css";

interface DialogVariantsProps {
    game: GameExecManager
    state: State
    links: RenderLink[]
    step: number
    /** Called with the chosen link; the parent applies it (it knows the rendered view). */
    onChoose: (link: RenderLink) => void
    responseAlignment: ResponseAlignment
    nested?: boolean
    interactive?: boolean
}

// 3D "card flip" reveal, preserved from the previous CSS keyframes but driven by framer-motion.
const containerVariants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } },
};

const itemVariants: Variants = {
    hidden: { rotateX: 90, opacity: 0, y: '10%' },
    show: { rotateX: 0, opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
};

const DialogVariants: React.FC<DialogVariantsProps> = ({ game, state, onChoose, links, step, responseAlignment, nested, interactive = true }) => {

    const visuals = resolveVisuals(game.game.visuals)

    const click = (link: RenderLink, ev: React.MouseEvent) => {
        ev.stopPropagation()
        onChoose(link)
    }

    const variantsClass = [
        nested ? 'dialog-variants dialog-variants--nested' : dialogVariantsClass(responseAlignment),
        !interactive ? 'dialog-variants--pending' : '',
    ].filter(Boolean).join(' ');

    if (state.fatalError) {
        return <div className={variantsClass} />
    }

    return (
        <div className={variantsClass}>
            <AnimatePresence mode="popLayout">
                <motion.div
                    key={`${step}-${interactive}`}
                    className="dialog-variants-group"
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                >
                    {links.map((link, i) => {
                        const appearance = resolveLinkAppearance(link.link, visuals, link.visited)
                        return (
                            <motion.div key={link.text + i} className="dialog-variant-button-container" variants={itemVariants}>
                                <motion.button
                                    disabled={link.disabled || !interactive}
                                    className={`dialog-button ${appearance.className}`}
                                    data-link-category={appearance.category}
                                    data-link-type={appearance.linkType}
                                    data-link-visited={appearance.visited ? 'true' : undefined}
                                    style={appearance.cssVars}
                                    onClick={interactive ? (ev) => click(link, ev) : undefined}
                                    whileHover={link.disabled ? undefined : { rotateX: 22, y: '6%' }}
                                    transition={{ duration: 0.12, ease: 'easeOut' }}
                                >
                                    <LinkButtonContent icon={appearance.icon} text={link.text} />
                                </motion.button>
                            </motion.div>
                        )
                    })}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default DialogVariants
