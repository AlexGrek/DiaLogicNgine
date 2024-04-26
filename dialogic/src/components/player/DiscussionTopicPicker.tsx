import React, { ReactNode } from 'react';
import { DiscussionTopicType, GameExecManager } from '../../exec/GameExecutor';
import { CarriedItem, State } from '../../exec/GameState';
import { LocalizationManager } from '../../exec/Localization';
import { CharDialogRenderView } from '../../exec/RenderView';
import { createEmptyFact, getFact } from '../../game/Fact';
import { getLoc } from '../../game/Loc';
import "./player.css";
import InputPickerView from './InputPickerView';

interface DiscussionTopicPickerProps {
    game: GameExecManager
    state: State
    view: CharDialogRenderView
    onTopicSelected: (topicType: DiscussionTopicType, topicValue: string) => void
    onCancel: () => void
    localization: LocalizationManager
}

const DiscussionTab: React.FC<{ children: ReactNode, name: string }> = ({ children, name }) => (
    <div className='discuss-picker-tab'>
        <p className='discuss-picker-name'>{name}</p>
        <div className='discuss-picker-body'>{children}</div>
    </div>
);

const SimpleTextList: React.FC<{
    children?: ReactNode,
    items: { name: string, value: string }[],
    onSelect: (value: string) => void
}> = ({ children, items, onSelect }) => {
    const renderedItems = items.map((item, idx) => (
        <p key={idx} onClick={() => onSelect(item.value)} className='discuss-picker-stl-item'>{item.name}</p>
    ))

    return <div className='discuss-picker-stl'>
        <p className='discuss-picker-stl-tools'>{children}</p>
        <div className='discuss-picker-stl-body'>{renderedItems}</div>
    </div>
};

const DiscussionTopicPicker: React.FC<DiscussionTopicPickerProps> = ({ game, localization, state, view, onTopicSelected, onCancel }) => {
    const getFacts = () => {
        return state.knownFacts.map((factid) => {
            let realFact = getFact(game.game, factid)
            if (!realFact) {
                realFact = createEmptyFact('error')
                realFact.short = `Error fact ${factid}`
            }
            return {
                name: realFact.short,
                value: realFact.uid,
                visible: realFact.discussable
            }
        }).filter(f => f.visible)
    }

    const getChars = () => {
        return state.knownPeople.map((charid) => {
            const descr = game.renderer.getCharInfoDescription(state, charid)
            return {
                name: descr.name,
                value: charid,
                visible: descr.charObject.discussable
            }
        }).filter(ch => ch.visible)
    }

    const getLocs = () => {
        return state.knownPlaces.map((id) => {
            let loc = getLoc(game.game, id)
            if (!loc) {
                return {
                    name: `No location found <${id}>`,
                    value: id,
                    visible: true
                }
            }
            return {
                name: loc.displayName,
                value: id,
                visible: loc.discussable
            }
        })
    }

    const handleFactSelect = (value: string): void => {
        onTopicSelected("fact", value)
    }

    const handleLocSelect = (value: string): void => {
        onTopicSelected("loc", value)
    }

    const handleCharSelect = (value: string): void => {
        onTopicSelected("char", value)
    }

    const handleItemSelect = (item: CarriedItem, _index: number): void => {
        onTopicSelected("item", item.item)
    }

    return (
        <div className='discuss-picker-main'>
            <div className='discuss-picker-control-panel'>
                <button onClick={onCancel}>{localization.local('Cancel')}</button>
            </div>
            <div className='discuss-picker-menu'>
                {view.dialogOptions.canDiscussChars && <DiscussionTab name={localization.local('People')}>
                    <SimpleTextList items={getChars()} onSelect={handleCharSelect}></SimpleTextList>
                </DiscussionTab>}
                {view.dialogOptions.canDiscussFacts && <DiscussionTab name={localization.local('Facts')}>
                    <SimpleTextList items={getFacts()} onSelect={handleFactSelect}></SimpleTextList>
                </DiscussionTab>}
                {view.dialogOptions.canDiscussItems && <DiscussionTab name={localization.local('Items')}>
                   <InputPickerView items={state.carriedItems} onChoose={handleItemSelect} context={game}/>
                </DiscussionTab>}
                {view.dialogOptions.canDiscussLocations && <DiscussionTab name={localization.local('Places')}>
                    <SimpleTextList items={getLocs()} onSelect={handleLocSelect}></SimpleTextList>
                </DiscussionTab>}
            </div>
        </div>
    );
};

export default DiscussionTopicPicker;
