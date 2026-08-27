import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
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
    /** `null` clears the selection (used to dismiss the popup / collapse a row). */
    onSelect: (index: number | null) => void;
    onUseItem?: (itemUid: string) => void;
    /** Localized "Use" label; defaults to "Use". */
    useLabel?: string;
    /** Localized empty-inventory message. */
    emptyLabel?: string;
    /** Localized "select an item" placeholder for the detail panel. */
    selectPromptLabel?: string;
    /** Localized title of the always-open detail subwindow. */
    detailsLabel?: string;
    /** Localized label of the popup close button. */
    closeLabel?: string;
}

interface InventoryItemDetailsProps {
    item: InventoryItemVM;
    useLabel: string;
    onUseItem?: (itemUid: string) => void;
}

/**
 * Body of the item detail view — shared by every layout so that a single set of
 * `.inventory-detail-*` classes (and therefore a single set of authored custom
 * CSS rules) styles the details no matter which layout the game selected.
 */
const InventoryItemDetails: React.FC<InventoryItemDetailsProps> = ({ item, useLabel, onUseItem }) => {
    const statsKeys = Object.keys(item.stats);
    return (
        <>
            <h2 className='inventory-detail-name'>{item.name}</h2>
            {item.detailImageUrl && (
                <motion.div
                    className='inventory-detail-image-wrap'
                    initial={{ opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                >
                    <img className='inventory-detail-image' src={item.detailImageUrl} alt={item.name} />
                </motion.div>
            )}
            <p className='inventory-detail-description'>{item.description}</p>
            {statsKeys.length > 0 && (
                <div className='inventory-detail-stats'>
                    {statsKeys.map((k, i) => (
                        <motion.span
                            key={k}
                            className='inventory-detail-stat'
                            initial={{ opacity: 0, y: 6, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ delay: 0.05 + Math.min(i, 8) * 0.04, duration: 0.18, ease: 'easeOut' }}
                        >
                            {k}: {item.stats[k]}
                        </motion.span>
                    ))}
                </div>
            )}
            {onUseItem && (
                <motion.button
                    className='inventory-detail-use-btn'
                    data-testid='inventory-use-btn'
                    onClick={() => onUseItem(item.uid)}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.93 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 17 }}
                >
                    {useLabel}
                </motion.button>
            )}
        </>
    );
};

const InventoryView: React.FC<InventoryViewProps> = ({
    items,
    layout,
    selectedIndex,
    onSelect,
    onUseItem,
    useLabel = 'Use',
    emptyLabel = 'Inventory is empty',
    selectPromptLabel = 'Select an item',
    detailsLabel = 'Details',
    closeLabel = 'Close',
}) => {
    // Constrains dragging of the detail subwindow to the inventory area.
    const containerRef = useRef<HTMLDivElement>(null);
    // The subwindow is dragged by its title bar only, so buttons inside it stay clickable.
    const dragControls = useDragControls();

    const selectedItem = selectedIndex !== null && selectedIndex < items.length
        ? items[selectedIndex]
        : null;

    useEffect(() => {
        if (layout !== 'popup' || selectedItem === null) {
            return;
        }
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onSelect(null); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [layout, selectedItem, onSelect]);

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

    /**
     * Card used by the popup and subwindow layouts. Same markup as the matrix
     * card (so `.inventory-item-card` CSS applies everywhere) but with a bouncier
     * entrance and a tilt on hover.
     */
    const renderPlayfulCard = (item: InventoryItemVM, index: number) => {
        const isSelected = index === selectedIndex;
        return (
            <motion.div
                key={item.uid}
                data-testid={`inventory-item-${item.uid}`}
                className={`inventory-item-card${isSelected ? ' selected' : ''}`}
                onClick={() => onSelect(index)}
                style={item.cardImageUrl ? { backgroundImage: `url(${item.cardImageUrl})` } : {}}
                initial={{ opacity: 0, scale: 0.6, rotate: -6 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{
                    type: 'spring',
                    stiffness: 340,
                    damping: 20,
                    delay: Math.min(index, 14) * 0.035,
                }}
                whileHover={{ scale: 1.08, rotate: index % 2 === 0 ? 1.5 : -1.5, zIndex: 3 }}
                whileTap={{ scale: 0.92, rotate: 0 }}
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

    /** Scroll layout: a tall menu row that expands to reveal its own details. */
    const renderScrollRow = (item: InventoryItemVM, index: number) => {
        const isSelected = index === selectedIndex;
        return (
            <motion.div
                key={item.uid}
                layout
                data-testid={`inventory-item-${item.uid}`}
                className={`inventory-scroll-item${isSelected ? ' selected' : ''}`}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    layout: { type: 'spring', stiffness: 380, damping: 34 },
                    duration: 0.25,
                    delay: Math.min(index, 12) * 0.04,
                    ease: 'easeOut',
                }}
            >
                <motion.div
                    className='inventory-scroll-item-head'
                    onClick={() => onSelect(isSelected ? null : index)}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.985 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                >
                    <motion.div
                        className='inventory-scroll-item-thumb'
                        style={item.cardImageUrl ? { backgroundImage: `url(${item.cardImageUrl})` } : {}}
                        animate={{ scale: isSelected ? 1.1 : 1, rotate: isSelected ? -3 : 0 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 16 }}
                    />
                    <span className='inventory-scroll-item-name'>{item.name}</span>
                    {item.quantity > 1 && (
                        <span className='inventory-scroll-item-qty'>x{item.quantity}</span>
                    )}
                    <motion.span
                        className='inventory-scroll-item-chevron'
                        animate={{ rotate: isSelected ? 90 : 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                        &#8250;
                    </motion.span>
                </motion.div>
                <AnimatePresence initial={false}>
                    {isSelected && (
                        <motion.div
                            key='body'
                            className='inventory-scroll-item-body'
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{
                                height: { type: 'spring', stiffness: 300, damping: 30 },
                                opacity: { duration: 0.18 },
                            }}
                        >
                            <div className='inventory-detail' data-testid='inventory-detail'>
                                <InventoryItemDetails item={item} useLabel={useLabel} onUseItem={onUseItem} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    };

    const renderDetail = () => {
        if (selectedItem === null) {
            return (
                <motion.div key="empty" className='inventory-detail-empty' initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
                    <p>{selectPromptLabel}</p>
                </motion.div>
            );
        }
        return (
            <motion.div
                key={selectedItem.uid}
                className='inventory-detail'
                data-testid='inventory-detail'
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
            >
                <InventoryItemDetails item={selectedItem} useLabel={useLabel} onUseItem={onUseItem} />
            </motion.div>
        );
    };

    /** Popup layout: details fly in over the grid as a dismissable card. */
    const renderPopup = () => (
        <AnimatePresence>
            {selectedItem !== null && (
                <motion.div
                    key='backdrop'
                    className='inventory-popup-backdrop'
                    data-testid='inventory-popup-backdrop'
                    onClick={() => onSelect(null)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                >
                    <motion.div
                        className='inventory-popup'
                        data-testid='inventory-popup'
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.7, y: 30, rotate: -3 }}
                        animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.82, y: 16, rotate: 2 }}
                        transition={{ type: 'spring', stiffness: 330, damping: 22, mass: 0.8 }}
                    >
                        <motion.button
                            className='inventory-popup-close'
                            data-testid='inventory-popup-close'
                            aria-label={closeLabel}
                            onClick={() => onSelect(null)}
                            whileHover={{ scale: 1.18, rotate: 90 }}
                            whileTap={{ scale: 0.85 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                        >
                            &#215;
                        </motion.button>
                        <div className='inventory-detail' data-testid='inventory-detail'>
                            <InventoryItemDetails item={selectedItem} useLabel={useLabel} onUseItem={onUseItem} />
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    /** Subwindow layout: a small, always-open, drag-by-the-titlebar detail window. */
    const renderSubwindow = () => (
        <motion.div
            className='inventory-subwindow'
            data-testid='inventory-subwindow'
            drag
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={containerRef}
            dragElastic={0.1}
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.85, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
            whileDrag={{ scale: 1.03, boxShadow: '0 18px 42px rgba(0, 0, 0, 0.7)' }}
        >
            <div
                className='inventory-subwindow-titlebar'
                onPointerDown={(e) => dragControls.start(e)}
            >
                <AnimatePresence mode='wait'>
                    <motion.span
                        key={selectedItem ? selectedItem.uid : '__none'}
                        className='inventory-subwindow-title'
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15 }}
                    >
                        {selectedItem ? selectedItem.name : detailsLabel}
                    </motion.span>
                </AnimatePresence>
                <span className='inventory-subwindow-grip'>&#8942;&#8942;</span>
            </div>
            <div className='inventory-subwindow-body'>
                <AnimatePresence mode='wait'>
                    {selectedItem !== null ? (
                        <motion.div
                            key={selectedItem.uid}
                            className='inventory-detail'
                            data-testid='inventory-detail'
                            initial={{ opacity: 0, y: 14, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.98 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                        >
                            <InventoryItemDetails item={selectedItem} useLabel={useLabel} onUseItem={onUseItem} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key='__none'
                            className='inventory-detail-empty'
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <p>{selectPromptLabel}</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );

    if (items.length === 0) {
        return (
            <div className='inventory-empty' data-testid='inventory-empty'>
                <p>{emptyLabel}</p>
            </div>
        );
    }

    if (layout === 'popup') {
        return (
            <div className='inventory-tab-container inventory-tab-container--popup' data-testid='inventory-tab'>
                <div className='inventory-grid-panel'>
                    <div className='inventory-grid'>
                        {items.map((item, i) => renderPlayfulCard(item, i))}
                    </div>
                </div>
                {renderPopup()}
            </div>
        );
    }

    if (layout === 'subwindow') {
        return (
            <div
                ref={containerRef}
                className='inventory-tab-container inventory-tab-container--subwindow'
                data-testid='inventory-tab'
            >
                <div className='inventory-grid-panel'>
                    <div className='inventory-grid'>
                        {items.map((item, i) => renderPlayfulCard(item, i))}
                    </div>
                </div>
                {renderSubwindow()}
            </div>
        );
    }

    if (layout === 'scroll') {
        return (
            <div className='inventory-tab-container inventory-tab-container--scroll' data-testid='inventory-tab'>
                <div className='inventory-grid-panel'>
                    <div className='inventory-scroll'>
                        {items.map((item, i) => renderScrollRow(item, i))}
                    </div>
                </div>
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
