import PinIcon from '@rsuite/icons/Pin';
import lodash from 'lodash';
import React from 'react';
import { Button, Drawer, Input } from 'rsuite';
import { IUpds } from '../../../App';
import { isValidJsIdentifier } from '../../../Utils';
import { createEmptyFact } from '../../../game/Fact';
import { GameDescription } from '../../../game/GameDescription';
import ConfirmDeleteButton from '../../common/ConfirmDeleteButton';
import CreateWithUid, { CreationData } from '../../common/CreateWithUid';
import './facts.css';

interface FactsMenuProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
    handlers: IUpds;
    visible: boolean
}

const FactsMenu: React.FC<FactsMenuProps> = ({ game, onSetGame, handlers, visible }) => {
    const [editFact, setEditFact] = React.useState<number>(-1)

    if (!visible) {
        return <div />
    }

    const createFact = (data: CreationData) => {
        if (!isValidJsIdentifier(data.uid)) {
            return
        }
        const fact = createEmptyFact(data.uid)
        fact.short = data.name
        setEditFact(game.facts.length)
        onSetGame({ ...game, facts: [...game.facts, fact] })
    }

    const deleteFact = (index: number) => {
        setEditFact(-1)
        const facts = lodash.cloneDeep(game.facts)
        facts.splice(index, 1)
        onSetGame({ ...game, facts: facts })
    }

    const renderFactsList = () => {
        return game.facts.map((fact, i) => {
            return <div className='fact-item' key={i} onClick={() => setEditFact(i)}>
                <div className='fact-header'><PinIcon /><p className='fact-uid'>{fact.uid}</p></div>
                <p className='fact-short'>{fact.short}</p>
            </div>
        })
    }

    const renderDrawerContents = () => {
        const fact = game.facts[editFact]
        const updateFact = (prop: "short" | "full", value: string) => {
            const updatedFacts = lodash.cloneDeep(game.facts)
            updatedFacts[editFact][prop] = value
            onSetGame({ ...game, facts: updatedFacts })
        }

        return <div className='facts-drawer-contents'>
            <Input value={fact.short} onChange={(val) => updateFact("short", val)} placeholder='short description'></Input>
            <Input value={fact.full} onChange={(val) => updateFact("full", val)} as="textarea" rows={5} placeholder='full description'></Input>
            <p className='fact-edit-uid'>Fact UID: <b>{fact.uid}</b></p>
        </div>
    }

    return (
        <div>
            <div className='facts-create-panel'>
                <CreateWithUid objectName='fact' onCreate={createFact} />
            </div>
            <div className='facts-container'>
                {renderFactsList()}
            </div>
            <Drawer placement='right' open={editFact >= 0 && editFact < game.facts.length} onClose={() => setEditFact(-1)}>
                <Drawer.Header>
                    <Drawer.Title>Edit fact</Drawer.Title>
                    <Drawer.Actions>
                        <ConfirmDeleteButton onConfirm={() => deleteFact(editFact)} objectDescr="fact"></ConfirmDeleteButton>
                        <Button onClick={() => setEditFact(-1)} appearance="primary">
                            Save
                        </Button>
                    </Drawer.Actions>
                </Drawer.Header>
                <Drawer.Body>
                    {editFact >= 0 && editFact < game.facts.length ? renderDrawerContents() : null}
                </Drawer.Body>
            </Drawer>
        </div>
    );
};

export default FactsMenu;
