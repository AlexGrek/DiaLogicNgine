import React, { useEffect, useRef, useState } from 'react';
import { GameExecManager } from '../../exec/GameExecutor';
import { State } from '../../exec/GameState';
import { LocalizationManager } from '../../exec/Localization';
import { CharDialogRenderView } from '../../exec/RenderView';
import DialogVariants from './DialogVariants';
import SpecialDialogVariants from './SpecialDialogVariants';
import "./player.css";

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
    const [inTransitionOut, setInTransitionOut] = useState<boolean>(false)
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
        setInTransitionOut(transitionOut)
    }, [transitionOut])

    useEffect(() => {
        localmanager.current = new LocalizationManager(game.game)
    }, [game])

    const text = view.text

    const transitionInOutClass = (base: string, index?: number, maxindex?: number) => {
        if (inTransitionOut) {
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
        if (!inTransitionOut) {
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
            setTimeout(() => {
                setInTransitionOut(false)
                setDiscuss(true)
            }, 200)
            setInTransitionOut(true)
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
                <SpecialDialogVariants game={game} state={state} onClick={handleSpecialDialogClick} transitionOut={inTransitionOut} inTransitionIn={inTransitionIn} links={[discussLink]} />
                <DialogVariants game={game} state={state} links={view.links} step={step} onStateUpd={onStateUpd} transitionOut={inTransitionOut} inTransitionIn={inTransitionIn} />
            </div>}
        </div>
    );
};

export default CharDialogView
