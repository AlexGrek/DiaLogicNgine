import React from 'react';
import lodash from 'lodash';
import { Button, ButtonGroup, Slider, Toggle } from 'rsuite';
import {
    FONT_SIZE_LABELS,
    FontSizeId,
    LinkCategoryStyle,
} from '../../../game/GameDescription';
import { parseCssColor, toCssColor } from '../../../lib/color';
import FontPicker from '../../common/FontPicker';
import IconPicker from '../../common/IconPicker';
import './LinkCategoriesTab.css';

const DEFAULT_TEXT_COLOR = '#ffffff';
const DEFAULT_BG_COLOR = '#141414';

interface LinkColorRowProps {
    label: string;
    testId: string;
    /** Current value as authored; `undefined` means "inherit". */
    value: string | undefined;
    fallbackHex: string;
    withOpacity?: boolean;
    onChange: (value: string) => void;
    onClear: () => void;
}

/** Colour picker + optional alpha slider, with "inherits default" as the empty state. */
export const LinkColorRow: React.FC<LinkColorRowProps> = ({
    label, testId, value, fallbackHex, withOpacity = false, onChange, onClear,
}) => {
    const current = parseCssColor(value);
    const alphaPercent = Math.round((current?.alpha ?? 1) * 100);
    return (
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
                        value={alphaPercent}
                        onChange={(v) => onChange(toCssColor(current?.hex ?? fallbackHex, Number(v) / 100))}
                    />
                )}
                {withOpacity && (
                    <span className="link-category-alpha-value">{alphaPercent}%</span>
                )}
                {current ? (
                    <Button size="xs" appearance="subtle" onClick={onClear}>Clear</Button>
                ) : (
                    <span className="visuals-property-hint link-category-inherit-note">inherits default</span>
                )}
            </div>
        </div>
    );
};

interface LinkStyleFormProps {
    style: LinkCategoryStyle;
    onChange: (style: LinkCategoryStyle) => void;
    /** Prefix of every data-testid emitted here, e.g. `link-category`. */
    testIdPrefix: string;
    iconHint: string;
}

/**
 * The look of one link button style — shared by the per-category editor and the
 * per-direction-type editor, so both offer exactly the same knobs.
 */
const LinkStyleForm: React.FC<LinkStyleFormProps> = ({ style, onChange, testIdPrefix, iconHint }) => {
    const patch = (p: Partial<LinkCategoryStyle>) => onChange({ ...style, ...p });
    const drop = (...fields: (keyof LinkCategoryStyle)[]) =>
        onChange(lodash.omit(style, fields) as LinkCategoryStyle);

    return (
        <>
            <div>
                <IconPicker
                    optional
                    value={style.iconId}
                    onChange={(iconId) => patch({ iconId })}
                    onClear={() => drop('iconId')}
                >
                    Icon
                </IconPicker>
                <p className="visuals-property-hint">{iconHint}</p>
            </div>

            <LinkColorRow
                label="Text color"
                testId={`${testIdPrefix}-text-color`}
                value={style.textColor}
                fallbackHex={DEFAULT_TEXT_COLOR}
                onChange={(textColor) => patch({ textColor })}
                onClear={() => drop('textColor')}
            />

            <LinkColorRow
                label="Background color"
                testId={`${testIdPrefix}-bg-color`}
                value={style.backgroundColor}
                fallbackHex={DEFAULT_BG_COLOR}
                withOpacity
                onChange={(backgroundColor) => patch({ backgroundColor })}
                onClear={() => drop('backgroundColor')}
            />

            <div>
                <FontPicker
                    optional
                    value={style.fontId}
                    onChange={(fontId) => patch({ fontId })}
                    onClear={() => drop('fontId')}
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
                        onClick={() => drop('fontSize')}
                        data-testid={`${testIdPrefix}-font-size-inherit`}
                    >
                        Inherit
                    </Button>
                    {FONT_SIZE_LABELS.map((item) => (
                        <Button
                            key={item.value}
                            active={style.fontSize === item.value}
                            onClick={() => patch({ fontSize: item.value as FontSizeId })}
                            data-testid={`${testIdPrefix}-font-size-${item.value}`}
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
                            onChange={(bold) => (bold ? patch({ bold: true }) : drop('bold'))}
                        />
                        <span>Bold</span>
                    </label>
                    <label>
                        <Toggle
                            checked={Boolean(style.italic)}
                            onChange={(italic) => (italic ? patch({ italic: true }) : drop('italic'))}
                        />
                        <span>Italic</span>
                    </label>
                    <label>
                        <Toggle
                            checked={Boolean(style.uppercase)}
                            onChange={(uppercase) => (uppercase ? patch({ uppercase: true }) : drop('uppercase'))}
                        />
                        <span>Uppercase</span>
                    </label>
                </div>
            </div>
        </>
    );
};

export default LinkStyleForm;
