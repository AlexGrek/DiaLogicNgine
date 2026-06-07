import React, { useState } from 'react';
import { CarriedItem, State } from '../../exec/GameState';
import { GameExecManager } from '../../exec/GameExecutor';
import { getItemByIdOrUnknown } from '../../game/Items';
import { generateImageUrl } from '../../Utils';
import './inventorytab.css';

interface InventoryTabProps {
    state: State;
    game: GameExecManager;
    onUseItem?: (itemUid: string) => void;
}

const InventoryTab: React.FC<InventoryTabProps> = ({ state, game, onUseItem }) => {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const renderItemCard = (carried: CarriedItem, index: number) => {
        const item = getItemByIdOrUnknown(game.game.items, carried.item);
        const imgUrl = generateImageUrl(item.thumbnail || item.image || '');
        const isSelected = index === selectedIndex;
        return (
            <div
                key={carried.item}
                data-testid={`inventory-item-${carried.item}`}
                className={`inventory-item-card${isSelected ? ' selected' : ''}`}
                onClick={() => setSelectedIndex(index)}
                style={imgUrl ? { backgroundImage: `url(${imgUrl})` } : {}}
            >
                <div className='inventory-item-card-footer'>
                    <span className='inventory-item-card-name'>{item.name}</span>
                    {carried.quantity > 1 && (
                        <span className='inventory-item-card-qty'>x{carried.quantity}</span>
                    )}
                </div>
            </div>
        );
    };

    const renderDetail = () => {
        if (selectedIndex === null || selectedIndex >= state.carriedItems.length) {
            return (
                <div className='inventory-detail-empty'>
                    <p>Select an item</p>
                </div>
            );
        }
        const carried = state.carriedItems[selectedIndex];
        const item = getItemByIdOrUnknown(game.game.items, carried.item);
        const imgUrl = generateImageUrl(item.image || item.thumbnail || '');
        const statsKeys = Object.keys(item.stats);
        return (
            <div className='inventory-detail' data-testid='inventory-detail'>
                <h2 className='inventory-detail-name'>{item.name}</h2>
                {imgUrl && (
                    <div className='inventory-detail-image-wrap'>
                        <img className='inventory-detail-image' src={imgUrl} alt={item.name} />
                    </div>
                )}
                <p className='inventory-detail-description'>{item.description}</p>
                {statsKeys.length > 0 && (
                    <div className='inventory-detail-stats'>
                        {statsKeys.map(k => (
                            <span key={k} className='inventory-detail-stat'>{k}: {item.stats[k]}</span>
                        ))}
                    </div>
                )}
                {onUseItem && (
                    <button
                        className='inventory-detail-use-btn'
                        data-testid='inventory-use-btn'
                        onClick={() => onUseItem(carried.item)}
                    >
                        Use
                    </button>
                )}
            </div>
        );
    };

    if (state.carriedItems.length === 0) {
        return (
            <div className='inventory-empty' data-testid='inventory-empty'>
                <p>Inventory is empty</p>
            </div>
        );
    }

    return (
        <div className='inventory-tab-container' data-testid='inventory-tab'>
            <div className='inventory-grid-panel'>
                <div className='inventory-grid'>
                    {state.carriedItems.map((carried, i) => renderItemCard(carried, i))}
                </div>
            </div>
            <div className='inventory-detail-panel'>
                {renderDetail()}
            </div>
        </div>
    );
};

export default InventoryTab;
