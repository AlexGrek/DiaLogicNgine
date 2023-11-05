import React, { useEffect, useState } from 'react';
import { generateImageUrl } from '../../Utils';
import { GameExecManager } from '../../exec/GameExecutor';
import { HistoryRecord, State } from '../../exec/GameState';
import { CharDialogRenderView, DialogRenderView, LocRouteRenderView, LocationRenderView } from '../../exec/RenderView';
import { DialogLink } from '../../game/Dialog';
import DialogVariants from './DialogVariants';
import "./player.css";
import LocButton from './LocButton';

interface CharDialogViewProps {
    game: GameExecManager;
    state: State;
    view: CharDialogRenderView
    step: number
    onStateUpd: (newState: State) => void
    transitionOut: boolean
}

const CharDialogView: React.FC<CharDialogViewProps> = ({ game, state, onStateUpd, view, transitionOut, step }) => {
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
    }, [view, state])

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

    const click = (link: DialogLink, textOfLink: string) => {
        const clickData = { actor: null, text: text, answer: textOfLink, step: step } // TODO: add actor
        onStateUpd(game.dialogVariantApply(state, link, clickData))
    }

    const dialogVariants = () => {
        return view.links.map((link, i) => {
            const textOfLink = link.text
            return (<div key={link.text + i} className={transitionInOutClass("dialog-variant-button-container")}>
                <button disabled={link.disabled} className='dialog-button' onClick={() => click(link.link, textOfLink)}>{textOfLink}</button>
            </div>)
        })
    }

    return (
        <div className={transitionOutClass("dialog-window-view")}>
            <div className={transitionInOutClass('dialog-widget-special-links')}>
                
            </div>
            <div className='dialog-controls'>
                <div key={step << 1} className={transitionOutClass("dialog-text")}>
                    {/* <p className='dialog-prev-text' key={state.stepCount}>
                            {prevText}
                        </p> */}
                    <p className='dialog-current-text' key={step << 1}>
                        {state.fatalError ? state.fatalError.message : text}
                    </p>
                </div>
                <DialogVariants game={game} state={state} links={view.links} step={step} onStateUpd={onStateUpd} transitionOut={transitionOut} inTransitionIn={inTransitionIn} />
            </div>
        </div>
    );
};

export default CharDialogView
