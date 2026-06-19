import React from 'react';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import { GameExecManager } from '../../exec/GameExecutor';
import { State } from '../../exec/GameState';
import { ResponseAlignment } from '../../game/GameDescription';
import { dialogVariantsClass } from './visualsClasses';
import "./player.css";

export interface SpecialDialogVariant {
    icon?: string
    name: string
    value: string
    disabled?: boolean
    disabledReason?: string
}

interface SpecialDialogVariantsProps {
    game: GameExecManager
    state: State
    links: SpecialDialogVariant[]
    onClick: (name: string) => void
    text?: string
    responseAlignment: ResponseAlignment
    nested?: boolean
    interactive?: boolean
}

const containerVariants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } },
};

const itemVariants: Variants = {
    hidden: { rotateX: 90, opacity: 0, y: '10%' },
    show: { rotateX: 0, opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
};

const SpecialDialogVariants: React.FC<SpecialDialogVariantsProps> = ({ onClick, links, responseAlignment, nested, interactive = true }) => {

    const variantsClass = [
        nested ? 'dialog-variants dialog-variants--nested special' : `${dialogVariantsClass(responseAlignment)} special`,
        !interactive ? 'dialog-variants--pending' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className={variantsClass}>
            <AnimatePresence mode="popLayout">
                <motion.div
                    key={`${interactive}`}
                    className="dialog-variants-group"
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                >
                    {links.map((link, i) => (
                        <motion.div key={link.name + i} className="dialog-variant-button-container special" variants={itemVariants}>
                            <motion.button
                                disabled={link.disabled || !interactive}
                                className="dialog-button special"
                                onClick={interactive ? () => onClick(link.value) : undefined}
                                whileHover={link.disabled ? undefined : { rotateX: 22, y: '6%' }}
                                transition={{ duration: 0.12, ease: 'easeOut' }}
                            >
                                <span className="dialog-variant-icon">{link.icon || ''}</span>
                                {link.name}
                            </motion.button>
                        </motion.div>
                    ))}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default SpecialDialogVariants
