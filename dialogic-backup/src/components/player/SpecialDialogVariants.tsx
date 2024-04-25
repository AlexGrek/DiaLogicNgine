import React from 'react';
import { GameExecManager } from '../../exec/GameExecutor';
import { State } from '../../exec/GameState';
import { RenderLink } from '../../exec/RenderView';
import { DialogLink } from '../../game/Dialog';
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
    transitionOut: boolean
    inTransitionIn: boolean
    text?: string
}

const SpecialDialogVariants: React.FC<SpecialDialogVariantsProps> = ({ game, text, state, onClick, links, transitionOut, inTransitionIn }) => {

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

    const specialDialogVariants = () => {
        return links.map((link, i) => {
            const textOfLink = link.name
            return (<div key={link.name + i} className={transitionInOutClass("dialog-variant-button-container special")}>
                <button disabled={link.disabled} className='dialog-button special' onClick={() => onClick(link.value)}>
                    <span className='dialog-variant-icon'>{link.icon || ''}</span>
                    {textOfLink}
                </button>
            </div>)
        })
    }

    return (
        <div className="dialog-variants special">
            {specialDialogVariants()}
        </div>
    );
};

export default SpecialDialogVariants
