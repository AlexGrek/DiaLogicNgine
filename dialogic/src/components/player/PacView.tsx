import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { GameExecManager } from '../../exec/GameExecutor';
import { State } from '../../exec/GameState';
import { PacRenderView } from '../../exec/RenderView';
import "./player.css";
import PointAndClickScene from './PointAndClickScene';
import { PointAndClickZone } from '../../game/PointAndClick';

interface PacViewProps {
    game: GameExecManager;
    state: State;
    view: PacRenderView
    step: number
    onStateUpd: (newState: State) => void
}

const PacView: React.FC<PacViewProps> = ({ game, onStateUpd, view }) => {
    const handleZoneClick = useCallback((zone: PointAndClickZone) => {
        onStateUpd(game.pacZoneApply(zone, view))
    }, [game, onStateUpd, view])

    return (
        <motion.div
            className="pac-window-view"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
        >
            <PointAndClickScene backgroundImage={view.pac.background} zones={view.items} onZoneClick={handleZoneClick} />
        </motion.div>
    );
};

export default PacView
