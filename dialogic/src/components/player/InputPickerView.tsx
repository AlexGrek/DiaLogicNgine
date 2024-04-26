import React, { useState, useEffect } from 'react';
import { CarriedItem } from '../../exec/GameState';
import { GameExecManager } from '../../exec/GameExecutor';
import { getItemByIdOrUnknown } from '../../game/Items';
import { generateImageUrl } from '../../Utils';

interface InputPickerViewProps {
    items: CarriedItem[];
    onChoose: (carriedItem: CarriedItem, index: number) => void;
    context: GameExecManager
}

const InputPickerView: React.FC<InputPickerViewProps> = ({ items, onChoose, context }) => {
    const [chosenIndex, setChosenIndex] = useState<number>(-1);
    useEffect(() => {
        setChosenIndex(-1);
    }, [items]);

    const renderDescr = (item: CarriedItem) => {
        const realItem = getItemByIdOrUnknown(context.game.items, item.item);
        return <div className='player-items-descr'>
            <div className='items-descr-image'>
                <img className='items-descr-image-img' alt={item.item} src={generateImageUrl(realItem.image || realItem.thumbnail || "")}></img>
            </div>
            <div className='items-descr-data'>
                <button className='items-descr-header' onClick={() => onChoose(item, chosenIndex)}>{realItem.name}</button>
                <p className='items-descr-header-descr'>{realItem.description}</p>
            </div>
        </div>
    }

    const renderPickable = (item: CarriedItem, index: number) => {
        const realItem = getItemByIdOrUnknown(context.game.items, item.item);
        const bgImage = generateImageUrl(realItem.image || realItem.thumbnail || "");
        return <div className='player-items-picker-item' onClick={() => setChosenIndex(index)} style={{backgroundImage: `url(${bgImage})`}}>
            <div className='player-items-picker-item-header'>
                <p>{realItem.name}</p>
                <p className='player-items-picker-item-header-q'>{item.quantity}</p>
            </div>
        </div>
    }

    return (
        <div className='player-items-picker-container'>

            {chosenIndex >= 0 && renderDescr(items[chosenIndex])}
            {chosenIndex < 0 && <div className='player-items-descr'>
                <p className='player-items-picker-tip-text'>Choose item below</p>
                </div>}

            <div className='player-items-picker'>
                {items.map((i, el) => renderPickable(i, el))}
            </div>
        </div>
    );
};

export default InputPickerView;
