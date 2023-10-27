import React from 'react';
import { GameDescription } from '../../../game/GameDescription';
import { Behavior, Reaction, ReactionTrigger, createReaction } from '../../../game/Character';
import { IUpds } from '../../../App';
import { Button, ButtonGroup, CheckPicker, IconButton, Input, Modal, Tag } from 'rsuite';
import CopyButton from '../../common/copypaste/CopyButton';
import PagePreviousIcon from '@rsuite/icons/PagePrevious';
import PasteButton from '../../common/copypaste/PasteButton';
import PlusRoundIcon from '@rsuite/icons/PlusRound';
import DialogWindowPicker from '../../common/DialogWindowPicker';
import { DialogWindowId } from '../../../exec/GameState';
import './charediting.css'

interface BehaviorEditorProps {
    game: GameDescription;
    value: Behavior
    onSetBehavior: (behavior: Behavior) => void
    handlers: IUpds
}

const BehaviorEditor: React.FC<BehaviorEditorProps> = ({ game, value, onSetBehavior, handlers }) => {
    const [triggerEditorOpen, setTriggerEditorOpen] = React.useState<boolean>(false)
    const [rindex, setRindex] = React.useState<number>(-1)

    const editReactionTriggers = (i: number) => {
        setRindex(i)
        setTriggerEditorOpen(true)
    }

    const newReaction = () => {
        const copy = [...value.reactions]
        copy.push(createReaction())
        setRindex(copy.length - 1)
        onSetBehavior({...value, reactions: copy})
    }

    const pasteReaction = (rany: any, typename: string) => {
        const r = rany as Reaction
        const copy = [...value.reactions]
        copy.push(r)
        setRindex(copy.length - 1)
        onSetBehavior({...value, reactions: copy})
    }

    const editReaction = (val: Reaction) => {
        const copy = [...value.reactions]
        copy[rindex] = val
        onSetBehavior({...value, reactions: copy})
    }

    const deleteReaction = () => {
        const copy = [...value.reactions]
        copy.splice(rindex, 1)
        setRindex(-1)
        setTriggerEditorOpen(false)
        onSetBehavior({...value, reactions: copy})
    }

    const reactions = value.reactions.map((r, i) => {
        const triggers = [...r.trigger.chars, ...r.trigger.facts, ...r.trigger.items, ...r.trigger.places]
        return <div key={i} className='behaviour-reaction-short' onClick={() => setRindex(i)}>
            <span className='behaviour-reaction-short-trigs' onClick={() => editReactionTriggers(i)}>{JSON.stringify(triggers)}</span>
        </div>
    })

    const reactionsMenu = <div className='behavior-reactions-menu animate__backInLeft animate__animated'>
        <ButtonGroup>
        <IconButton icon={<PlusRoundIcon />} onClick={() => newReaction()}>Create</IconButton>
                <PasteButton handlers={handlers} typenames={['reaction']} onPasteClick={pasteReaction} />
        </ButtonGroup>
        {reactions}
    </div>

    const reactionEditor = (r: Reaction) => {
        const editDialog = (d: string | null, w: string | null) => {
            if (d === null || w === null) {
                editReaction({...r, dialogWindow: undefined})
                return
            }
            const id: DialogWindowId = {
                kind: "window",
                dialog: d,
                window: w
            }
            editReaction({...r, dialogWindow: id})
        }

        const triggersList = [...r.trigger.chars, ...r.trigger.facts, ...r.trigger.items, ...r.trigger.places].map((trig, i) => {
            return <Tag key={i}>{trig}</Tag>
        })
        
        return <div className='reaction-editor animate__zoomIn animate__animated animate__faster'>
            <ButtonGroup>
                <IconButton icon={<PagePreviousIcon />} placement="left" onClick={() => setRindex(-1)}>
                    Done
                </IconButton>
                <CopyButton handlers={handlers} typename={'reaction'} obj={r}></CopyButton>
                <Button color='red' onClick={() => deleteReaction()}>Delete</Button>
            </ButtonGroup>
            <div className='reaction-editor-triggers-list'>
                {triggersList}
                <Button appearance='link' onClick={() => setTriggerEditorOpen(true)}>Edit triggers</Button>
            </div>
            {!r.dialogWindow && <Input name="reply" placeholder='Reply text' value={r.reply} onChange={(value) => editReaction({...r, reply: value})}/>}
            <DialogWindowPicker handlers={handlers} dialogs={game.dialogs} chosen={r.dialogWindow === undefined ? null : [r.dialogWindow.dialog, r.dialogWindow.window]} onValueChange={editDialog}/>
            {r.dialogWindow && <Button onClick={() => editDialog(null, null)}>Just reply</Button>}
        </div>
    }

    const triggerEditor = () => {
        const r = value.reactions[rindex]
        if (r === undefined) {
            return <div/>
        }

        const updateTrig = (name: keyof ReactionTrigger) => (v: string[]) => {
            const trigCopy = {...r.trigger, [name]: v}
            editReaction({...r, trigger: trigCopy})
        }

        const facts = game.facts.map(fact => {
            return {
                label: fact.short,
                value: fact.uid
            }
        })
        const chars = game.chars.map(ch => {
            const name = ch.displayName.main !== "" ? ch.displayName.main : ch.uid
            return {
                label: name,
                value: ch.uid
            }
        })
        const places = game.locs.map(loc => {
            return {
                label: loc.displayName,
                value: loc.uid
            }
        })
        const items = game.items.filter(it => it.discussable).map(it => {
            return {
                label: it.name,
                value: it.uid
            }
        })
        return <div className='behavior-editor-triggers-container'>
            <CheckPicker value={r.trigger.facts} onChange={updateTrig("facts")} label="Facts" data={facts}/>
            <CheckPicker value={r.trigger.items} onChange={updateTrig("items")} label="Items" data={items}/>
            <CheckPicker value={r.trigger.chars} onChange={updateTrig("chars")} label="Characters" data={chars}/>
            <CheckPicker value={r.trigger.places} onChange={updateTrig("places")} label="Places" data={places}/>
        </div>
    }

    return (
        <div className='behavior-editor'>
            <p>Behavior</p>
            {rindex >= 0 && rindex < value.reactions.length ? reactionEditor(value.reactions[rindex]) : reactionsMenu}
            <Modal open={triggerEditorOpen}>
                <Modal.Header>
                    <Modal.Title>Edit triggers for reaction</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {triggerEditor()}
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={() => setTriggerEditorOpen(false)} appearance="primary">
                        Ok
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default BehaviorEditor;
