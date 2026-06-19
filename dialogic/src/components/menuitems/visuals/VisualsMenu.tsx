import React from 'react';
import { Button, ButtonGroup, InputNumber, Slider, Toggle } from 'rsuite';
import FontPicker from '../../common/FontPicker';
import PillLikeTabs, { PillTab } from '../../common/PillLikeTabs';
import {
    DEFAULT_MENU_PANEL_BORDER_RADIUS,
    DialogTextAlignment,
    FONT_SIZE_LABELS,
    FontSizeId,
    GameDescription,
    ResponseAlignment,
    VisualsConfiguration,
} from '../../../game/GameDescription';
import { resolveVisuals } from '../../player/visualsClasses';
import './VisualsMenu.css';

interface VisualsMenuProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void;
}

const TEXT_ALIGNMENTS: { value: DialogTextAlignment; label: string }[] = [
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
    { value: 'full', label: 'Full' },
];

const RESPONSE_ALIGNMENTS: { value: ResponseAlignment; label: string }[] = [
    { value: 'column', label: 'Column' },
    { value: 'row', label: 'Row' },
    { value: 'flexible', label: 'Flexible' },
];

const parseNum = (value: number | string | null): number | null => {
    if (value === null) return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isNaN(n) ? null : n;
};

const VisualsMenu: React.FC<VisualsMenuProps> = ({ game, onSetGame }) => {
    const visuals = resolveVisuals(game.visuals);

    const updateVisuals = (patch: Partial<VisualsConfiguration>) => {
        onSetGame({ ...game, visuals: { ...visuals, ...patch } });
    };

    const sliderNumber = (
        value: number,
        max: number,
        onChange: (n: number) => void,
        min = 0,
    ) => (
        <div className="visuals-opacity-control">
            <Slider
                min={min}
                max={max}
                step={1}
                value={value}
                onChange={(v) => { const n = parseNum(v); if (n !== null) onChange(n); }}
            />
            <InputNumber
                min={min}
                max={max}
                step={1}
                value={value}
                onChange={(v) => { const n = parseNum(v); if (n !== null) onChange(n); }}
            />
        </div>
    );

    const segmentedControl = <T extends string>(
        data: { value: T; label: string }[],
        value: T,
        onChange: (v: T) => void,
    ) => (
        <ButtonGroup>
            {data.map((item) => (
                <Button
                    key={item.value}
                    active={value === item.value}
                    onClick={() => onChange(item.value)}
                >
                    {item.label}
                </Button>
            ))}
        </ButtonGroup>
    );

    const fontSizeButtons = (value: FontSizeId, onChange: (v: FontSizeId) => void) =>
        segmentedControl(FONT_SIZE_LABELS, value, onChange);

    const typographyTab = (
        <div className="visuals-properties">
            <div>
                <p className="editor-label">Menu font</p>
                <p className="visuals-property-hint">Font used for in-game menus and HUD chrome.</p>
                <FontPicker
                    value={visuals.menuFontId}
                    onChange={(menuFontId) => updateVisuals({ menuFontId })}
                />
            </div>
            <div>
                <p className="editor-label">Text font</p>
                <p className="visuals-property-hint">Font used for dialog and narrative text.</p>
                <FontPicker
                    value={visuals.textFontId}
                    onChange={(textFontId) => updateVisuals({ textFontId })}
                />
            </div>
            <div>
                <p className="editor-label">Text size (default)</p>
                <p className="visuals-property-hint">Default size of dialog and narrative text. Players can override this in settings.</p>
                {fontSizeButtons(visuals.textFontSize, (textFontSize) => updateVisuals({ textFontSize }))}
            </div>
            <div>
                <p className="editor-label">Responses font</p>
                <p className="visuals-property-hint">Font used for choice / response buttons.</p>
                <FontPicker
                    value={visuals.responsesFontId}
                    onChange={(responsesFontId) => updateVisuals({ responsesFontId })}
                />
            </div>
            <div>
                <p className="editor-label">Responses size (default)</p>
                <p className="visuals-property-hint">Default size of choice / response buttons. Players can override this in settings.</p>
                {fontSizeButtons(visuals.responsesFontSize, (responsesFontSize) => updateVisuals({ responsesFontSize }))}
            </div>
        </div>
    );

    const dialogTab = (
        <div className="visuals-properties">
            <div>
                <p className="editor-label">Dialog text placement</p>
                <p className="visuals-property-hint">Where the dialog text panel appears in the player.</p>
                {segmentedControl(
                    TEXT_ALIGNMENTS,
                    visuals.dialogTextAlignment,
                    (v) => updateVisuals({ dialogTextAlignment: v }),
                )}
            </div>
            <div>
                <p className="editor-label">Response alignment</p>
                <p className="visuals-property-hint">How choice buttons are laid out in the player.</p>
                {segmentedControl(
                    RESPONSE_ALIGNMENTS,
                    visuals.responseAlignment,
                    (v) => updateVisuals({ responseAlignment: v }),
                )}
            </div>
            <div>
                <p className="editor-label">Text background opacity</p>
                <p className="visuals-property-hint">Transparency of the dialog text panel (0 = fully transparent).</p>
                {sliderNumber(
                    visuals.dialogTextBackgroundOpacity,
                    100,
                    (n) => updateVisuals({ dialogTextBackgroundOpacity: n }),
                )}
            </div>
            <div>
                <p className="editor-label">Short history</p>
                <p className="visuals-property-hint">Show recent dialog exchanges above the current line.</p>
                <Toggle
                    checked={visuals.shortHistoryVisible}
                    checkedChildren="Enabled"
                    unCheckedChildren="Disabled"
                    onChange={(shortHistoryVisible) => updateVisuals({ shortHistoryVisible })}
                />
            </div>
            <div>
                <p className="editor-label">Typewriter effect</p>
                <p className="visuals-property-hint">Reveal dialog text character by character. Players can override this in the in-game settings.</p>
                <Toggle
                    checked={visuals.typewriterEnabled}
                    checkedChildren="Enabled"
                    unCheckedChildren="Disabled"
                    onChange={(typewriterEnabled) => updateVisuals({ typewriterEnabled })}
                />
            </div>
            {visuals.typewriterEnabled && (
                <div>
                    <p className="editor-label">Typewriter speed</p>
                    <p className="visuals-property-hint">Milliseconds between characters — lower is faster (10–80 ms).</p>
                    {sliderNumber(
                        visuals.typewriterSpeedMs,
                        80,
                        (n) => updateVisuals({ typewriterSpeedMs: n }),
                        10,
                    )}
                </div>
            )}
            <div>
                <p className="editor-label">Menu panels opacity</p>
                <p className="visuals-property-hint">Background opacity of in-game menu panels (0 = fully transparent).</p>
                {sliderNumber(
                    visuals.menuPanelOpacity,
                    100,
                    (n) => updateVisuals({ menuPanelOpacity: n }),
                )}
            </div>
            <div>
                <p className="editor-label">Menu panels corner radius</p>
                <p className="visuals-property-hint">Corner rounding of in-game menu panels in pixels (0 = square, default {DEFAULT_MENU_PANEL_BORDER_RADIUS}px).</p>
                {sliderNumber(
                    visuals.menuPanelBorderRadius,
                    50,
                    (n) => updateVisuals({ menuPanelBorderRadius: n }),
                )}
            </div>
        </div>
    );

    const notificationsTab = (
        <div className="visuals-properties">
            <div>
                <p className="editor-label">Background opacity</p>
                <p className="visuals-property-hint">Transparency of the notification toast background (0 = fully transparent).</p>
                {sliderNumber(
                    visuals.notificationBackgroundOpacity,
                    100,
                    (n) => updateVisuals({ notificationBackgroundOpacity: n }),
                )}
            </div>
            <div>
                <p className="editor-label">Border radius</p>
                <p className="visuals-property-hint">Corner rounding of notification toasts in pixels (0 = square).</p>
                {sliderNumber(
                    visuals.notificationBorderRadius,
                    50,
                    (n) => updateVisuals({ notificationBorderRadius: n }),
                )}
            </div>
            <div>
                <p className="editor-label">Border opacity</p>
                <p className="visuals-property-hint">Visibility of the notification toast border (0 = no border).</p>
                {sliderNumber(
                    visuals.notificationBorderOpacity,
                    100,
                    (n) => updateVisuals({ notificationBorderOpacity: n }),
                )}
            </div>
        </div>
    );

    const customCssTab = (
        <div className="visuals-properties">
            <div>
                <p className="editor-label">Custom CSS</p>
                <p className="visuals-property-hint">CSS injected into the player at runtime. Use standard selectors — e.g. <code>.dialog-text</code>, <code>.dialog-variants</code>.</p>
                <textarea
                    className="visuals-custom-css-editor"
                    value={visuals.customCss}
                    onChange={(e) => updateVisuals({ customCss: e.target.value })}
                    placeholder="/* e.g. .dialog-text { color: #fff; } */"
                    spellCheck={false}
                    data-testid="visuals-custom-css"
                />
            </div>
        </div>
    );

    const tabs: PillTab[] = [
        { header: 'Typography', content: typographyTab },
        { header: 'Dialog', content: dialogTab },
        { header: 'Notifications', content: notificationsTab },
        { header: 'Custom CSS', content: customCssTab },
    ];

    return (
        <div className="visuals-menu">
            <h3 className="center-header">Visuals</h3>
            <PillLikeTabs tabs={tabs} />
        </div>
    );
};

export default VisualsMenu;
