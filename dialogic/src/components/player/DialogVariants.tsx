import React from 'react';
import { GameExecManager } from '../../exec/GameExecutor';
import { State } from '../../exec/GameState';
import { RenderLink } from '../../exec/RenderView';
import { DialogLink } from '../../game/Dialog';
import { ResponseAlignment } from '../../game/GameDescription';
import { dialogVariantsClass } from './visualsClasses';
import LinkButtonContent from './LinkButtonContent';
import "./player.css";

interface DialogVariantsProps {
    game: GameExecManager
    state: State
    links: RenderLink[]
    step: number
    onStateUpd: (newState: State) => void
    transitionOut: boolean
    inTransitionIn: boolean
    text?: string
    responseAlignment: ResponseAlignment
    nested?: boolean
    interactive?: boolean
}

const DialogVariants: React.FC<DialogVariantsProps> = ({ game, text, state, onStateUpd, links, transitionOut, step, inTransitionIn, responseAlignment, nested, interactive = true }) => {

    const transitionInOutClass = (base: string, index?: number, maxindex?: number) => {
        if (!interactive) {
            return base
        }
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

    const click = (link: DialogLink, textOfLink: string, ev: React.MouseEvent) => {
        ev.stopPropagation()
        const clickData = { actor: null, text: text || '', answer: textOfLink, step: step } // TODO: add actor
        onStateUpd(game.dialogVariantApply(state, link, clickData))
    }

    const dialogVariants = () => {
        return links.map((link, i) => {
            const textOfLink = link.text
            return (<div key={link.text + i} className={transitionInOutClass("dialog-variant-button-container")}>
                <button disabled={link.disabled || !interactive} className='dialog-button' onClick={interactive ? (ev) => click(link.link, textOfLink, ev) : undefined}>
                    <LinkButtonContent link={link.link} text={textOfLink} />
                </button>
            </div>)
        })
    }

    const variantsClass = [
        nested ? 'dialog-variants dialog-variants--nested' : dialogVariantsClass(responseAlignment),
        !interactive ? 'dialog-variants--pending' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className={variantsClass}>
            {state.fatalError ? [] : dialogVariants()}
        </div>
    );
};

export default DialogVariants
