import React from 'react';
import { Button, ButtonGroup } from 'rsuite';
import {
    GameDescription,
    INVENTORY_LAYOUT_LABELS,
    InventoryLayout,
    VisualsConfiguration,
} from '../../../game/GameDescription';
import InventoryPreview from './InventoryPreview';
import './InventoryVisualsTab.css';

interface InventoryVisualsTabProps {
    game: GameDescription;
    visuals: VisualsConfiguration;
    updateVisuals: (patch: Partial<VisualsConfiguration>) => void;
}

interface CssClassDoc {
    selector: string;
    /** Which layout(s) the class applies to, for the badge. */
    scope: 'both' | 'matrix' | 'list' | 'detail';
    description: string;
}

const CSS_CLASS_DOCS: CssClassDoc[] = [
    { selector: '.inventory-tab-container', scope: 'both', description: 'Root container. Also carries .inventory-tab-container--matrix / --list modifiers for layout-specific overrides.' },
    { selector: '.inventory-grid-panel', scope: 'both', description: 'Left panel that holds the item grid or list (the scrollable picker column).' },
    { selector: '.inventory-grid', scope: 'matrix', description: 'The matrix grid wrapper (CSS grid of cards). Change grid-template-columns to set the number of columns.' },
    { selector: '.inventory-item-card', scope: 'matrix', description: 'A single item card in matrix layout. The item thumbnail is its background image.' },
    { selector: '.inventory-item-card.selected', scope: 'matrix', description: 'The currently selected card.' },
    { selector: '.inventory-item-card-footer', scope: 'matrix', description: 'The gradient footer at the bottom of a card holding the name and quantity.' },
    { selector: '.inventory-item-card-name', scope: 'matrix', description: 'Item name text inside a card footer.' },
    { selector: '.inventory-item-card-qty', scope: 'matrix', description: 'Quantity badge (e.g. x5) inside a card footer.' },
    { selector: '.inventory-list', scope: 'list', description: 'The list wrapper (vertical column of rows).' },
    { selector: '.inventory-list-item', scope: 'list', description: 'A single item row in list layout.' },
    { selector: '.inventory-list-item.selected', scope: 'list', description: 'The currently selected row.' },
    { selector: '.inventory-list-item-thumb', scope: 'list', description: 'The small square thumbnail at the start of a row.' },
    { selector: '.inventory-list-item-name', scope: 'list', description: 'Item name text in a row.' },
    { selector: '.inventory-list-item-qty', scope: 'list', description: 'Quantity badge in a row.' },
    { selector: '.inventory-detail-panel', scope: 'detail', description: 'Right panel showing the selected item details.' },
    { selector: '.inventory-detail', scope: 'detail', description: 'Wrapper for the selected item detail content.' },
    { selector: '.inventory-detail-name', scope: 'detail', description: 'Selected item title.' },
    { selector: '.inventory-detail-image', scope: 'detail', description: 'Large image of the selected item.' },
    { selector: '.inventory-detail-description', scope: 'detail', description: 'Selected item description text.' },
    { selector: '.inventory-detail-stats', scope: 'detail', description: 'Container for the selected item stat chips.' },
    { selector: '.inventory-detail-stat', scope: 'detail', description: 'A single stat chip (e.g. damage: 12).' },
    { selector: '.inventory-detail-use-btn', scope: 'detail', description: 'The "Use" button.' },
    { selector: '.inventory-detail-empty', scope: 'detail', description: 'Placeholder shown when no item is selected.' },
    { selector: '.inventory-empty', scope: 'both', description: 'Message shown when the inventory is empty.' },
];

const CSS_PLACEHOLDER = `/* Target the classes listed below. Example: */
.inventory-item-card.selected {
  border-color: gold;
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.6);
}

.inventory-detail-name {
  color: #ffd479;
}`;

const InventoryVisualsTab: React.FC<InventoryVisualsTabProps> = ({ game, visuals, updateVisuals }) => {
    const layoutControl = (
        <ButtonGroup>
            {INVENTORY_LAYOUT_LABELS.map((item) => (
                <Button
                    key={item.value}
                    active={visuals.inventoryLayout === item.value}
                    onClick={() => updateVisuals({ inventoryLayout: item.value as InventoryLayout })}
                    data-testid={`inventory-layout-${item.value}`}
                >
                    {item.label}
                </Button>
            ))}
        </ButtonGroup>
    );

    return (
        <div className="visuals-properties">
            <div>
                <p className="editor-label">Layout</p>
                <p className="visuals-property-hint">
                    How items are arranged in the item picker. <b>Matrix</b> shows a grid of image cards;
                    <b> List</b> shows a compact vertical list with thumbnails.
                </p>
                {layoutControl}
            </div>

            <div>
                <p className="editor-label">Live preview</p>
                <p className="visuals-property-hint">
                    Populated with every item defined in this game (sample items are shown when the game has none).
                    Click an item to preview the detail panel. Reflects the selected layout and your custom CSS as you type.
                </p>
                <InventoryPreview
                    layout={visuals.inventoryLayout}
                    customCss={visuals.inventoryCustomCss}
                    items={game.items}
                />
            </div>

            <div>
                <p className="editor-label">Custom CSS</p>
                <p className="visuals-property-hint">
                    CSS injected into the player, targeting the item picker. Use the class reference below.
                </p>
                <textarea
                    className="visuals-custom-css-editor"
                    value={visuals.inventoryCustomCss}
                    onChange={(e) => updateVisuals({ inventoryCustomCss: e.target.value })}
                    placeholder={CSS_PLACEHOLDER}
                    spellCheck={false}
                    data-testid="inventory-custom-css"
                />
            </div>

            <div>
                <p className="editor-label">CSS class reference</p>
                <p className="visuals-property-hint">Classes available in the item picker markup.</p>
                <div className="inventory-css-docs" data-testid="inventory-css-docs">
                    {CSS_CLASS_DOCS.map((doc) => (
                        <div className="inventory-css-doc-row" key={doc.selector}>
                            <code className="inventory-css-doc-selector">{doc.selector}</code>
                            <span className={`inventory-css-doc-scope inventory-css-doc-scope--${doc.scope}`}>{doc.scope}</span>
                            <span className="inventory-css-doc-desc">{doc.description}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InventoryVisualsTab;
