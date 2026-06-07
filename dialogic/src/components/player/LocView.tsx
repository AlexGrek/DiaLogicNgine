import React, { useEffect, useState } from 'react';
import { GameExecManager } from '../../exec/GameExecutor';
import { State } from '../../exec/GameState';
import { LocRouteRenderView, LocationRenderView } from '../../exec/RenderView';
import DialogVariants from './DialogVariants';
import { dialogWindowViewClass, resolveVisuals } from './visualsClasses';
import "./player.css";
import LocButton from './LocButton';

interface LocViewProps {
    game: GameExecManager;
    state: State;
    view: LocationRenderView
    step: number
    onStateUpd: (newState: State) => void
    transitionOut: boolean
}

const LocView: React.FC<LocViewProps> = ({ game, state, onStateUpd, view, transitionOut, step }) => {
    const visuals = resolveVisuals(game.game.visuals)
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
    }, [view, state.shortHistory.length])

    const text = view.text

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

    const clickRoute = (view: LocRouteRenderView) => {
        onStateUpd(game.locRouteApply(state, view))
    }

    const locButtons = () => {
        return view.routes.map((view) => {
            return <LocButton route={view} onClick={clickRoute}/>
        })
    }

    return (
        <div className={transitionOutClass(dialogWindowViewClass(visuals.dialogTextAlignment))}>
            <div className={transitionInOutClass('dialog-widget-special-links')}>
                {locButtons()}
            </div>
            <div className="dialog-content-column">
                <div className='dialog-controls'>
                    <div key={step << 1} className={transitionOutClass('dialog-text')}>
                        {/* <p className='dialog-prev-text' key={state.stepCount}>
                            {prevText}
                        </p> */}
                        <p className='dialog-current-text' key={step << 1}>
                            {state.fatalError ? state.fatalError.message : text}
                        </p>
                    </div>
                    <DialogVariants game={game} state={state} links={view.links} step={step} onStateUpd={onStateUpd} transitionOut={transitionOut} inTransitionIn={inTransitionIn} responseAlignment={visuals.responseAlignment} />
                </div>
            </div>
        </div>
    );
};

export default LocView
