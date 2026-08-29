import React, { useState } from 'react';
import { Button } from 'rsuite';
import {
    LinkCategoryStyle,
    VisualsConfiguration,
} from '../../../game/GameDescription';
import {
    LINK_CATEGORIES,
    LINK_CATEGORY_LABELS,
    LinkCategory,
} from '../../../game/Dialog';
import { linkCategoryCssVars, playerVisualsCssVars } from '../../player/visualsClasses';
import IconSvg from '../../common/IconSvg';
import LinkStyleForm from './LinkStyleForm';
import '../../player/player.css';
import './LinkCategoriesTab.css';

interface LinkCategoriesTabProps {
    visuals: VisualsConfiguration;
    updateVisuals: (patch: Partial<VisualsConfiguration>) => void;
}

const CATEGORY_HINTS: Record<LinkCategory, string> = {
    default: 'Every link that has no category set. Leave it untouched to keep the stock button look — or let the direction type style it, in the Link defaults tab.',
    action: 'For links that do something — attack, open, take, use.',
    question: 'For links that ask something of the speaker.',
    special_icon: 'Icon-driven. Each link in this category shows its own icon (set in the link editor); the icon below is only the fallback.',
    special_color: 'Colour-driven. Each link in this category carries its own text colour (set in the link editor); the text colour below is only the fallback.',
    class_a: 'Free slot. Also emits the CSS class .dialog-button--category-class_a for custom CSS.',
    class_b: 'Free slot. Also emits the CSS class .dialog-button--category-class_b for custom CSS.',
    class_c: 'Free slot. Also emits the CSS class .dialog-button--category-class_c for custom CSS.',
    class_d: 'Free slot. Also emits the CSS class .dialog-button--category-class_d for custom CSS.',
    class_e: 'Free slot. Also emits the CSS class .dialog-button--category-class_e for custom CSS.',
};

/** Sample label per category, used by the live preview. */
const PREVIEW_LABELS: Record<LinkCategory, string> = {
    default: 'Continue on your way',
    action: 'Open the iron door',
    question: 'Who left this here?',
    special_icon: 'Take the rusty key',
    special_color: 'Draw your sword',
    class_a: 'Class A button',
    class_b: 'Class B button',
    class_c: 'Class C button',
    class_d: 'Class D button',
    class_e: 'Class E button',
};

const LinkCategoriesTab: React.FC<LinkCategoriesTabProps> = ({ visuals, updateVisuals }) => {
    const [selected, setSelected] = useState<LinkCategory>('default');
    const style: LinkCategoryStyle = visuals.linkCategories[selected] ?? {};

    const writeStyle = (next: LinkCategoryStyle) => {
        updateVisuals({ linkCategories: { ...visuals.linkCategories, [selected]: next } });
    };

    const isCustomized = Object.keys(style).length > 0;

    const previewVars = {
        ...playerVisualsCssVars(visuals),
        ...linkCategoryCssVars(style, style.textColor),
    };

    return (
        <div className="visuals-properties">
            <div>
                <p className="editor-label">Category</p>
                <p className="visuals-property-hint">
                    Each link button belongs to one category, chosen per link in the link editor.
                    Style the category once here and every link in it follows.
                </p>
                <div className="link-category-tabs" data-testid="link-category-tabs">
                    {LINK_CATEGORIES.map((category) => {
                        const customized = Object.keys(visuals.linkCategories[category] ?? {}).length > 0;
                        return (
                            <Button
                                key={category}
                                size="xs"
                                appearance={selected === category ? 'primary' : 'default'}
                                onClick={() => setSelected(category)}
                                data-testid={`link-category-tab-${category}`}
                            >
                                {LINK_CATEGORY_LABELS[category]}
                                {customized && <span className="link-category-dot" />}
                            </Button>
                        );
                    })}
                </div>
                <p className="visuals-property-hint link-category-description">{CATEGORY_HINTS[selected]}</p>
            </div>

            <div>
                <p className="editor-label">Live preview</p>
                <div className="link-category-preview" data-testid="link-category-preview">
                    <button className={`dialog-button dialog-button--category-${selected}`} style={previewVars}>
                        <span className="dialog-link-label dialog-link-label--icon-before">
                            {style.iconId && <IconSvg iconId={style.iconId} className="dialog-link-icon" size={18} />}
                            <span className="dialog-link-text">{PREVIEW_LABELS[selected]}</span>
                        </span>
                    </button>
                </div>
            </div>

            <LinkStyleForm
                style={style}
                onChange={writeStyle}
                testIdPrefix="link-category"
                iconHint="Shown before the label on every link in this category. A link that carries its own icon overrides it."
            />

            <div>
                <Button
                    appearance="subtle"
                    disabled={!isCustomized}
                    onClick={() => writeStyle({})}
                    data-testid="link-category-reset"
                >
                    Reset "{LINK_CATEGORY_LABELS[selected]}" to the default look
                </Button>
            </div>
        </div>
    );
};

export default LinkCategoriesTab;
