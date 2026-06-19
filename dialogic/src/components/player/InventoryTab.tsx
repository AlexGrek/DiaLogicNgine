import React, { useMemo, useState } from 'react';
import { State } from '../../exec/GameState';
import { GameExecManager } from '../../exec/GameExecutor';
import { getItemByIdOrUnknown } from '../../game/Items';
import { InventoryLayout } from '../../game/GameDescription';
import { generateImageUrl } from '../../Utils';
import { resolveImageProject } from '../common/projectImages';
import { useProjectImages } from '../common/ProjectImagesContext';
import InventoryView, { InventoryItemVM } from './InventoryView';

interface InventoryTabProps {
    state: State;
    game: GameExecManager;
    layout?: InventoryLayout;
    onUseItem?: (itemUid: string) => void;
}

const InventoryTab: React.FC<InventoryTabProps> = ({ state, game, layout = 'matrix', onUseItem }) => {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const storageProject = resolveImageProject(useProjectImages());

    const items = useMemo<InventoryItemVM[]>(() => state.carriedItems.map((carried) => {
        const item = getItemByIdOrUnknown(game.game.items, carried.item);
        return {
            uid: carried.item,
            name: item.name,
            quantity: carried.quantity,
            cardImageUrl: generateImageUrl(item.thumbnail || item.image || '', storageProject),
            detailImageUrl: generateImageUrl(item.image || item.thumbnail || '', storageProject),
            description: item.description,
            stats: item.stats,
        };
    }), [state.carriedItems, game.game.items, storageProject]);

    return (
        <InventoryView
            items={items}
            layout={layout}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            onUseItem={onUseItem}
        />
    );
};

export default InventoryTab;
