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
    scope: 'all' | 'matrix' | 'list' | 'detail' | 'popup' | 'subwindow' | 'scroll';
    description: string;
}

const CSS_CLASS_DOCS: CssClassDoc[] = [
    { selector: '.inventory-tab-container', scope: 'all', description: 'Root container. Also carries an .inventory-tab-container--<layout> modifier (matrix / list / popup / subwindow / scroll) for layout-specific overrides.' },
    { selector: '.inventory-grid-panel', scope: 'all', description: 'The scrollable picker panel holding the item grid, list or menu.' },
    { selector: '.inventory-grid', scope: 'matrix', description: 'The card grid wrapper, used by the matrix, popup and subwindow layouts. Change grid-template-columns to set the number of columns.' },
    { selector: '.inventory-item-card', scope: 'matrix', description: 'A single item card in the matrix, popup and subwindow layouts. The item thumbnail is its background image.' },
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
    { selector: '.inventory-detail-panel', scope: 'detail', description: 'Right panel showing the selected item details (matrix and list layouts only).' },
    { selector: '.inventory-detail', scope: 'detail', description: 'Wrapper for the selected item detail content. Shared by every layout — inside the detail panel, the popup, the subwindow or the expanded scroll row.' },
    { selector: '.inventory-detail-name', scope: 'detail', description: 'Selected item title.' },
    { selector: '.inventory-detail-image', scope: 'detail', description: 'Large image of the selected item.' },
    { selector: '.inventory-detail-description', scope: 'detail', description: 'Selected item description text.' },
    { selector: '.inventory-detail-stats', scope: 'detail', description: 'Container for the selected item stat chips.' },
    { selector: '.inventory-detail-stat', scope: 'detail', description: 'A single stat chip (e.g. damage: 12).' },
    { selector: '.inventory-detail-use-btn', scope: 'detail', description: 'The "Use" button.' },
    { selector: '.inventory-detail-empty', scope: 'detail', description: 'Placeholder shown when no item is selected.' },
    { selector: '.inventory-popup-backdrop', scope: 'popup', description: 'Dimmed, blurred overlay behind the detail popup. Clicking it closes the popup.' },
    { selector: '.inventory-popup', scope: 'popup', description: 'The detail popup card itself.' },
    { selector: '.inventory-popup-close', scope: 'popup', description: 'Round close button in the popup corner.' },
    { selector: '.inventory-subwindow', scope: 'subwindow', description: 'The always-open, draggable detail window docked at the right of the grid.' },
    { selector: '.inventory-subwindow-titlebar', scope: 'subwindow', description: 'Title bar of the detail window — also its drag handle.' },
    { selector: '.inventory-subwindow-title', scope: 'subwindow', description: 'Title text (the selected item name, or "Details" when nothing is selected).' },
    { selector: '.inventory-subwindow-grip', scope: 'subwindow', description: 'Small drag-grip glyph at the end of the title bar.' },
    { selector: '.inventory-subwindow-body', scope: 'subwindow', description: 'Scrollable content area of the detail window.' },
    { selector: '.inventory-scroll', scope: 'scroll', description: 'The vertical menu wrapper (single scrollable column of rows).' },
    { selector: '.inventory-scroll-item', scope: 'scroll', description: 'A single menu row. Carries .selected while expanded.' },
    { selector: '.inventory-scroll-item-head', scope: 'scroll', description: 'Clickable header of a row (thumbnail, name, quantity, chevron).' },
    { selector: '.inventory-scroll-item-thumb', scope: 'scroll', description: 'Thumbnail at the start of a row.' },
    { selector: '.inventory-scroll-item-name', scope: 'scroll', description: 'Item name text in a row.' },
    { selector: '.inventory-scroll-item-qty', scope: 'scroll', description: 'Quantity badge in a row.' },
    { selector: '.inventory-scroll-item-chevron', scope: 'scroll', description: 'Chevron that rotates when the row expands.' },
    { selector: '.inventory-scroll-item-body', scope: 'scroll', description: 'Expanding area of a row that holds the inline item details.' },
    { selector: '.inventory-empty', scope: 'all', description: 'Message shown when the inventory is empty.' },
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
                    How items are arranged in the item picker. <b>Matrix</b> shows a grid of image cards next to a
                    detail panel; <b>List</b> shows a compact vertical list with thumbnails;
                    <b> Popup</b> shows a full-width grid and opens the details in a dismissable popup;
                    <b> Subwindow</b> shows a full-width grid with an always-open, draggable detail window;
                    <b> Scroll</b> is a single scrollable menu whose rows expand to reveal their own details.
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
