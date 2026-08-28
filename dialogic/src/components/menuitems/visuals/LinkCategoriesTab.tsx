import React, { useState } from 'react';
import lodash from 'lodash';
import { Button, ButtonGroup, Slider, Toggle } from 'rsuite';
import {
    FONT_SIZE_LABELS,
    FontSizeId,
    LinkCategoryStyle,
    VisualsConfiguration,
} from '../../../game/GameDescription';
import {
    LINK_CATEGORIES,
    LINK_CATEGORY_LABELS,
    LinkCategory,
} from '../../../game/Dialog';
import { linkCategoryCssVars, playerVisualsCssVars } from '../../player/visualsClasses';
import { parseCssColor, toCssColor } from '../../../lib/color';
import FontPicker from '../../common/FontPicker';
import IconPicker from '../../common/IconPicker';
import IconSvg from '../../common/IconSvg';
import '../../player/player.css';
import './LinkCategoriesTab.css';

interface LinkCategoriesTabProps {
    visuals: VisualsConfiguration;
    updateVisuals: (patch: Partial<VisualsConfiguration>) => void;
}

const CATEGORY_HINTS: Record<LinkCategory, string> = {
    default: 'Every link that has no category set. Leave it untouched to keep the stock button look.',
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

const DEFAULT_TEXT_COLOR = '#ffffff';
const DEFAULT_BG_COLOR = '#141414';

const LinkCategoriesTab: React.FC<LinkCategoriesTabProps> = ({ visuals, updateVisuals }) => {
    const [selected, setSelected] = useState<LinkCategory>('default');
    const style: LinkCategoryStyle = visuals.linkCategories[selected] ?? {};

    const writeStyle = (next: LinkCategoryStyle) => {
        updateVisuals({ linkCategories: { ...visuals.linkCategories, [selected]: next } });
    };

    const patchStyle = (patch: Partial<LinkCategoryStyle>) => writeStyle({ ...style, ...patch });

    const dropField = (...fields: (keyof LinkCategoryStyle)[]) =>
        writeStyle(lodash.omit(style, fields) as LinkCategoryStyle);

    const isCustomized = Object.keys(style).length > 0;

    const textColor = parseCssColor(style.textColor);
    const background = parseCssColor(style.backgroundColor);

    const colorRow = (
        label: string,
        testId: string,
        current: { hex: string; alpha: number } | null,
        fallbackHex: string,
        onChange: (value: string) => void,
        onClear: () => void,
        withOpacity: boolean,
    ) => (
        <div>
            <p className="editor-label">{label}</p>
            <div className="link-category-color-row">
                <input
                    type="color"
                    data-testid={testId}
                    value={current?.hex ?? fallbackHex}
                    onChange={(e) => onChange(toCssColor(e.target.value, current?.alpha ?? 1))}
                />
                {withOpacity && (
                    <Slider
                        className="link-category-alpha-slider"
                        min={0}
                        max={100}
                        step={1}
                        value={Math.round((current?.alpha ?? 1) * 100)}
                        onChange={(v) => onChange(toCssColor(current?.hex ?? fallbackHex, Number(v) / 100))}
                    />
                )}
                {withOpacity && (
                    <span className="link-category-alpha-value">
                        {Math.round((current?.alpha ?? 1) * 100)}%
                    </span>
                )}
                {current ? (
                    <Button size="xs" appearance="subtle" onClick={onClear}>Clear</Button>
                ) : (
                    <span className="visuals-property-hint link-category-inherit-note">inherits default</span>
                )}
            </div>
        </div>
    );

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

            <div>
                <IconPicker
                    optional
                    value={style.iconId}
                    onChange={(iconId) => patchStyle({ iconId })}
                    onClear={() => dropField('iconId')}
                >
                    Icon
                </IconPicker>
                <p className="visuals-property-hint">
                    Shown before the label on every link in this category. A link that carries its own icon
                    overrides it.
                </p>
            </div>

            {colorRow(
                'Text color',
                'link-category-text-color',
                textColor,
                DEFAULT_TEXT_COLOR,
                (textColor) => patchStyle({ textColor }),
                () => dropField('textColor'),
                false,
            )}

            {colorRow(
                'Background color',
                'link-category-bg-color',
                background,
                DEFAULT_BG_COLOR,
                (backgroundColor) => patchStyle({ backgroundColor }),
                () => dropField('backgroundColor'),
                true,
            )}

            <div>
                <FontPicker
                    optional
                    value={style.fontId}
                    onChange={(fontId) => patchStyle({ fontId })}
                    onClear={() => dropField('fontId')}
                >
                    Font
                </FontPicker>
                <p className="visuals-property-hint">
                    Unset inherits the global responses font from the Typography tab.
                </p>
            </div>

            <div>
                <p className="editor-label">Font size</p>
                <p className="visuals-property-hint">
                    Relative to the responses size, so a player who enlarges text in the in-game settings still gets
                    a proportionally bigger button.
                </p>
                <ButtonGroup>
                    <Button
                        active={style.fontSize === undefined}
                        onClick={() => dropField('fontSize')}
                        data-testid="link-category-font-size-inherit"
                    >
                        Inherit
                    </Button>
                    {FONT_SIZE_LABELS.map((item) => (
                        <Button
                            key={item.value}
                            active={style.fontSize === item.value}
                            onClick={() => patchStyle({ fontSize: item.value as FontSizeId })}
                            data-testid={`link-category-font-size-${item.value}`}
                        >
                            {item.label}
                        </Button>
                    ))}
                </ButtonGroup>
            </div>

            <div>
                <p className="editor-label">Font style</p>
                <div className="link-category-toggles">
                    <label>
                        <Toggle
                            checked={Boolean(style.bold)}
                            onChange={(bold) => (bold ? patchStyle({ bold: true }) : dropField('bold'))}
                        />
                        <span>Bold</span>
                    </label>
                    <label>
                        <Toggle
                            checked={Boolean(style.italic)}
                            onChange={(italic) => (italic ? patchStyle({ italic: true }) : dropField('italic'))}
                        />
                        <span>Italic</span>
                    </label>
                    <label>
                        <Toggle
                            checked={Boolean(style.uppercase)}
                            onChange={(uppercase) => (uppercase ? patchStyle({ uppercase: true }) : dropField('uppercase'))}
                        />
                        <span>Uppercase</span>
                    </label>
                </div>
            </div>

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
