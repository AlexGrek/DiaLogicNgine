import React, { useEffect, useMemo, useState } from 'react';
import { InventoryLayout } from '../../../game/GameDescription';
import { Item } from '../../../game/Items';
import { generateImageUrl } from '../../../Utils';
import { resolveImageProject } from '../../common/projectImages';
import { useProjectImages } from '../../common/ProjectImagesContext';
import InventoryView, { InventoryItemVM } from '../../player/InventoryView';

const swatch = (label: string, color: string): string =>
    `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'>` +
        `<rect width='96' height='96' fill='${color}'/>` +
        `<text x='50%' y='54%' font-size='44' fill='rgba(255,255,255,0.9)' text-anchor='middle' ` +
        `dominant-baseline='middle' font-family='sans-serif'>${label}</text></svg>`
    )}`;

/** Shown only when the game defines no items yet, so the preview is never empty. */
const SAMPLE_ITEMS: InventoryItemVM[] = [
    {
        uid: 'sample-sword', name: 'Iron Sword', quantity: 1,
        cardImageUrl: swatch('⚔', '#5a4632'), detailImageUrl: swatch('⚔', '#5a4632'),
        description: 'A well-balanced blade, dented from many battles but still sharp.',
        stats: { damage: 12, weight: 3 },
    },
    {
        uid: 'sample-potion', name: 'Health Potion', quantity: 5,
        cardImageUrl: swatch('♥', '#7a2230'), detailImageUrl: swatch('♥', '#7a2230'),
        description: 'A crimson brew that knits wounds and restores vigor.',
        stats: { heals: 25 },
    },
    {
        uid: 'sample-key', name: 'Brass Key', quantity: 1,
        cardImageUrl: swatch('⚷', '#6b5a1f'), detailImageUrl: swatch('⚷', '#6b5a1f'),
        description: 'An ornate key. You wonder which door it opens.',
        stats: {},
    },
];

interface InventoryPreviewProps {
    layout: InventoryLayout;
    customCss: string;
    /** All items defined in the game; the preview renders every one of them. */
    items: Item[];
}

/**
 * Self-contained, in-editor preview of the inventory / item picker menu. Renders
 * the same {@link InventoryView} markup the runtime uses — populated with every
 * item defined in the game (with a small sample set as a fallback when the game
 * has no items yet) — and injects the authored `customCss` live so authors can
 * iterate on their styles. Because the only `.inventory-*` DOM present in the
 * editor is this preview, the injected stylesheet only affects the preview.
 */
const InventoryPreview: React.FC<InventoryPreviewProps> = ({ layout, customCss, items }) => {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
    const storageProject = resolveImageProject(useProjectImages());

    const previewItems = useMemo<InventoryItemVM[]>(() => {
        if (items.length === 0) {
            return SAMPLE_ITEMS;
        }
        return items.map((item, index) => ({
            uid: item.uid,
            name: item.name || item.uid,
            // Fabricate plausible quantities so the quantity badge is styleable.
            quantity: item.stackable ? 2 + (index % 5) : 1,
            cardImageUrl: generateImageUrl(item.thumbnail || item.image || '', storageProject),
            detailImageUrl: generateImageUrl(item.image || item.thumbnail || '', storageProject),
            description: item.description,
            stats: item.stats,
        }));
    }, [items, storageProject]);

    const trimmed = useMemo(() => customCss.trim(), [customCss]);

    useEffect(() => {
        if (!trimmed) return;
        const style = document.createElement('style');
        style.setAttribute('data-inventory-preview-css', 'true');
        style.textContent = trimmed;
        document.head.appendChild(style);
        return () => { style.remove(); };
    }, [trimmed]);

    return (
        <div className="inventory-preview-frame" data-testid="inventory-preview">
            <InventoryView
                items={previewItems}
                layout={layout}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
                onUseItem={() => { /* no-op in preview */ }}
            />
        </div>
    );
};

export default InventoryPreview;
