import React, { useEffect, useRef, useState } from 'react';
import { generateImageUrl } from '../../Utils';
import { GameExecManager } from '../../exec/GameExecutor';
import { HistoryRecord, State } from '../../exec/GameState';
import { CharDialogRenderView, DialogRenderView, LocRouteRenderView, LocationRenderView } from '../../exec/RenderView';
import { DialogLink } from '../../game/Dialog';
import DialogVariants from './DialogVariants';
import "./player.css";
import LocButton from './LocButton';
import SpecialDialogVariants from './SpecialDialogVariants';
import { LocalizationManager } from '../../exec/Localization';

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
    const [discuss, setDiscuss] = useState<boolean>(false)
    const localmanager = useRef<LocalizationManager>(new LocalizationManager(game.game))

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
        setDiscuss(false)
        setInTransitionIn(true)
        setTimeout(() => setInTransitionIn(false), 250)
    }, [view, state])

    useEffect(() => {
        localmanager.current = new LocalizationManager(game.game)
    }, [game])

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

    return (
        <div className={transitionOutClass("dialog-window-view")}>
            <div className={transitionInOutClass('dialog-widget-special-links')}>
                
            </div>
            {!discuss && <div className='dialog-controls'>
                <div key={step << 1} className={transitionOutClass("dialog-text")}>
                    <p className='dialog-current-text' key={step << 1}>
                        {state.fatalError ? state.fatalError.message : text}
                    </p>
                </div>
                <SpecialDialogVariants game={game} state={state} onClick={handleSpecialDialogClick} transitionOut={transitionOut} inTransitionIn={inTransitionIn} links={[discussLink]}/>
                <DialogVariants game={game} state={state} links={view.links} step={step} onStateUpd={onStateUpd} transitionOut={transitionOut} inTransitionIn={inTransitionIn} />
            </div>}
        </div>
    );
};

export default CharDialogView
