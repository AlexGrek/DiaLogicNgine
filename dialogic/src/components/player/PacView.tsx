import React, { useCallback, useEffect, useState } from 'react';
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
    transitionOut: boolean
}

const PacView: React.FC<PacViewProps> = ({ game, state, onStateUpd, view, transitionOut, step }) => {
    const [inTransitionIn, setInTransitionIn] = useState<boolean>(false)

    useEffect(() => {
        if (state.shortHistory.length > 0) {
            const latest = document.getElementById("dialog-short-history-scrollable")
            if (latest) {
                setTimeout(() => {
                    latest.scrollTop = latest.scrollHeight;
                    console.log("Scroll to bottom applied")
                }, 100)
            }
        }

        setInTransitionIn(true)
        setTimeout(() => setInTransitionIn(false), 250)
    }, [view])

    const transitionInOutClass = (base: string, index?: number, maxindex?: number) => {
        if (transitionOut) {
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

    const handleZoneClick = useCallback((zone: PointAndClickZone) => {
        onStateUpd(game.pacZoneApply(zone, view))
    }, [game, onStateUpd, view])

    return (
        <div className={transitionOutClass("dialog-window-view")}>
            <PointAndClickScene backgroundImage={view.pac.background || ''} zones={view.items} onZoneClick={handleZoneClick} />
        </div>
    );
};

export default PacView
