import React from 'react';
import { Button, ButtonGroup, InputNumber, Nav, Slider, Toggle } from 'rsuite';
import FontPicker from '../../common/FontPicker';
import {
    DialogTextAlignment,
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

type TabKey = 'typography' | 'dialog' | 'notifications';

const parseNum = (value: number | string | null): number | null => {
    if (value === null) return null;
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isNaN(n) ? null : n;
};

const VisualsMenu: React.FC<VisualsMenuProps> = ({ game, onSetGame }) => {
    const [activeTab, setActiveTab] = React.useState<TabKey>('typography');
    const visuals = resolveVisuals(game.visuals);

    const updateVisuals = (patch: Partial<VisualsConfiguration>) => {
        onSetGame({ ...game, visuals: { ...visuals, ...patch } });
    };

    const sliderNumber = (
        value: number,
        max: number,
        onChange: (n: number) => void,
    ) => (
        <div className="visuals-opacity-control">
            <Slider
                min={0}
                max={max}
                step={1}
                value={value}
                onChange={(v) => { const n = parseNum(v); if (n !== null) onChange(n); }}
            />
            <InputNumber
                min={0}
                max={max}
                step={1}
                value={value}
                onChange={(v) => { const n = parseNum(v); if (n !== null) onChange(n); }}
            />
        </div>
    );

    return (
        <div className="visuals-menu">
            <h3 className="center-header">Visuals</h3>
            <Nav
                appearance="tabs"
                activeKey={activeTab}
                onSelect={(key) => setActiveTab(key as TabKey)}
                style={{ marginBottom: 16 }}
            >
                <Nav.Item eventKey="typography">Typography</Nav.Item>
                <Nav.Item eventKey="dialog">Dialog</Nav.Item>
                <Nav.Item eventKey="notifications">Notifications</Nav.Item>
            </Nav>

            {activeTab === 'typography' && (
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
                        <p className="editor-label">Responses font</p>
                        <p className="visuals-property-hint">Font used for choice / response buttons.</p>
                        <FontPicker
                            value={visuals.responsesFontId}
                            onChange={(responsesFontId) => updateVisuals({ responsesFontId })}
                        />
                    </div>
                </div>
            )}

            {activeTab === 'dialog' && (
                <div className="visuals-properties">
                    <div>
                        <p className="editor-label">Dialog text placement</p>
                        <p className="visuals-property-hint">Where the dialog text panel appears in the player.</p>
                        <ButtonGroup>
                            {TEXT_ALIGNMENTS.map(({ value, label }) => (
                                <Button
                                    key={value}
                                    active={visuals.dialogTextAlignment === value}
                                    onClick={() => updateVisuals({ dialogTextAlignment: value })}
                                >
                                    {label}
                                </Button>
                            ))}
                        </ButtonGroup>
                    </div>
                    <div>
                        <p className="editor-label">Response alignment</p>
                        <p className="visuals-property-hint">How choice buttons are laid out in the player.</p>
                        <ButtonGroup>
                            {RESPONSE_ALIGNMENTS.map(({ value, label }) => (
                                <Button
                                    key={value}
                                    active={visuals.responseAlignment === value}
                                    onClick={() => updateVisuals({ responseAlignment: value })}
                                >
                                    {label}
                                </Button>
                            ))}
                        </ButtonGroup>
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
                </div>
            )}

            {activeTab === 'notifications' && (
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
            )}
        </div>
    );
};

export default VisualsMenu;
