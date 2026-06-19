import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { InventoryLayout } from '../../game/GameDescription';
import './inventorytab.css';

/**
 * Presentational view-model for one inventory entry. Both the runtime
 * {@link InventoryTab} (resolving real carried items) and the editor inventory
 * preview render through {@link InventoryView}, so the markup / class names stay
 * identical and authored custom CSS behaves the same in the editor and in-game.
 */
export interface InventoryItemVM {
    uid: string;
    name: string;
    quantity: number;
    /** Image used as the card / row thumbnail background. */
    cardImageUrl: string;
    /** Larger image shown in the detail panel. */
    detailImageUrl: string;
    description: string;
    stats: { [key: string]: number | string };
}

interface InventoryViewProps {
    items: InventoryItemVM[];
    layout: InventoryLayout;
    selectedIndex: number | null;
    onSelect: (index: number) => void;
    onUseItem?: (itemUid: string) => void;
    /** Localized "Use" label; defaults to "Use". */
    useLabel?: string;
    /** Localized empty-inventory message. */
    emptyLabel?: string;
    /** Localized "select an item" placeholder for the detail panel. */
    selectPromptLabel?: string;
}

const InventoryView: React.FC<InventoryViewProps> = ({
    items,
    layout,
    selectedIndex,
    onSelect,
    onUseItem,
    useLabel = 'Use',
    emptyLabel = 'Inventory is empty',
    selectPromptLabel = 'Select an item',
}) => {
    const renderMatrixCard = (item: InventoryItemVM, index: number) => {
        const isSelected = index === selectedIndex;
        return (
            <motion.div
                key={item.uid}
                data-testid={`inventory-item-${item.uid}`}
                className={`inventory-item-card${isSelected ? ' selected' : ''}`}
                onClick={() => onSelect(index)}
                style={item.cardImageUrl ? { backgroundImage: `url(${item.cardImageUrl})` } : {}}
                initial={{ opacity: 0, y: 12, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2, delay: Math.min(index, 12) * 0.03, ease: 'easeOut' }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.98 }}
            >
                <div className='inventory-item-card-footer'>
                    <span className='inventory-item-card-name'>{item.name}</span>
                    {item.quantity > 1 && (
                        <span className='inventory-item-card-qty'>x{item.quantity}</span>
                    )}
                </div>
            </motion.div>
        );
    };

    const renderListRow = (item: InventoryItemVM, index: number) => {
        const isSelected = index === selectedIndex;
        return (
            <motion.div
                key={item.uid}
                data-testid={`inventory-item-${item.uid}`}
                className={`inventory-list-item${isSelected ? ' selected' : ''}`}
                onClick={() => onSelect(index)}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index, 12) * 0.03, ease: 'easeOut' }}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.99 }}
            >
                <div
                    className='inventory-list-item-thumb'
                    style={item.cardImageUrl ? { backgroundImage: `url(${item.cardImageUrl})` } : {}}
                />
                <span className='inventory-list-item-name'>{item.name}</span>
                {item.quantity > 1 && (
                    <span className='inventory-list-item-qty'>x{item.quantity}</span>
                )}
            </motion.div>
        );
    };

    const renderDetail = () => {
        if (selectedIndex === null || selectedIndex >= items.length) {
            return (
                <motion.div key="empty" className='inventory-detail-empty' initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                    <p>{selectPromptLabel}</p>
                </motion.div>
            );
        }
        const item = items[selectedIndex];
        const statsKeys = Object.keys(item.stats);
        return (
            <motion.div
                key={item.uid}
                className='inventory-detail'
                data-testid='inventory-detail'
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
            >
                <h2 className='inventory-detail-name'>{item.name}</h2>
                {item.detailImageUrl && (
                    <div className='inventory-detail-image-wrap'>
                        <img className='inventory-detail-image' src={item.detailImageUrl} alt={item.name} />
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
                        onClick={() => onUseItem(item.uid)}
                    >
                        {useLabel}
                    </button>
                )}
            </motion.div>
        );
    };

    if (items.length === 0) {
        return (
            <div className='inventory-empty' data-testid='inventory-empty'>
                <p>{emptyLabel}</p>
            </div>
        );
    }

    return (
        <div className={`inventory-tab-container inventory-tab-container--${layout}`} data-testid='inventory-tab'>
            <div className='inventory-grid-panel'>
                {layout === 'list' ? (
                    <div className='inventory-list'>
                        {items.map((item, i) => renderListRow(item, i))}
                    </div>
                ) : (
                    <div className='inventory-grid'>
                        {items.map((item, i) => renderMatrixCard(item, i))}
                    </div>
                )}
            </div>
            <div className='inventory-detail-panel'>
                <AnimatePresence mode="wait">
                    {renderDetail()}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default InventoryView;
