import React from 'react';
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
    transitionOut: boolean
    inTransitionIn: boolean
    text?: string
    responseAlignment: ResponseAlignment
    nested?: boolean
    interactive?: boolean
}

const SpecialDialogVariants: React.FC<SpecialDialogVariantsProps> = ({ onClick, links, transitionOut, inTransitionIn, responseAlignment, nested, interactive = true }) => {

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

    const specialDialogVariants = () => {
        return links.map((link, i) => {
            const textOfLink = link.name
            return (<div key={link.name + i} className={transitionInOutClass("dialog-variant-button-container special")}>
                <button disabled={link.disabled || !interactive} className='dialog-button special' onClick={interactive ? () => onClick(link.value) : undefined}>
                    <span className='dialog-variant-icon'>{link.icon || ''}</span>
                    {textOfLink}
                </button>
            </div>)
        })
    }

    const variantsClass = [
        nested ? 'dialog-variants dialog-variants--nested special' : `${dialogVariantsClass(responseAlignment)} special`,
        !interactive ? 'dialog-variants--pending' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className={variantsClass}>
            {specialDialogVariants()}
        </div>
    );
};

export default SpecialDialogVariants
