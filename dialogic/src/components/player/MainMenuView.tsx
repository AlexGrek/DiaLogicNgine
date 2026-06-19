import React from 'react';
import { motion } from 'framer-motion';
import { GameDescription } from '../../game/GameDescription';
import { resolveImageProject } from '../common/projectImages';
import { useProjectImages } from '../common/ProjectImagesContext';
import { styleWithImage } from '../UiUtils';

interface MainMenuViewProps {
    game: GameDescription;
    onStart: () => void;
    onExit?: () => void;
}

const rise = {
    hidden: { opacity: 0, y: 12 },
    show: (delay: number) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const } }),
};

const MainMenuView: React.FC<MainMenuViewProps> = ({ game, onStart, onExit }) => {
    const storageProject = resolveImageProject(useProjectImages());

    const bgStyle = game.startMenu.menuBackground
        ? styleWithImage(game.startMenu.menuBackground, storageProject)
        : {};

    return (
        <motion.div
            data-testid="main-menu-overlay"
            className="main-menu-overlay"
            style={bgStyle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            <div className="main-menu-backdrop" />
            <div className="main-menu-content">
                <motion.h1 className="main-menu-title" variants={rise} initial="hidden" animate="show" custom={0}>
                    {game.general.name || 'DiaLogicNgine'}
                </motion.h1>
                {game.general.description && (
                    <motion.p className="main-menu-subtitle" variants={rise} initial="hidden" animate="show" custom={0.1}>
                        {game.general.description}
                    </motion.p>
                )}
                <div className="main-menu-buttons">
                    <motion.button
                        data-testid="main-menu-new-game"
                        className="main-menu-btn main-menu-btn-primary"
                        onClick={onStart}
                        variants={rise}
                        initial="hidden"
                        animate="show"
                        custom={0.2}
                        whileHover={{ y: -1 }}
                        whileTap={{ y: 0 }}
                    >
                        ▶&nbsp;&nbsp;New Game
                    </motion.button>
                    {onExit && (
                        <motion.button
                            data-testid="main-menu-exit"
                            className="main-menu-btn main-menu-btn-exit"
                            onClick={onExit}
                            variants={rise}
                            initial="hidden"
                            animate="show"
                            custom={0.3}
                            whileHover={{ y: -1 }}
                            whileTap={{ y: 0 }}
                        >
                            Exit
                        </motion.button>
                    )}
                </div>
                <motion.div className="main-menu-footer" variants={rise} initial="hidden" animate="show" custom={0.35}>
                    v{game.general.version || '0.0.0'}
                </motion.div>
            </div>
        </motion.div>
    );
};

export default MainMenuView;
