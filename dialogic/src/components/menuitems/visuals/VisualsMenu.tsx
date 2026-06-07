import React from 'react';
import { Button, ButtonGroup, InputNumber, Slider, Toggle } from 'rsuite';
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

const VisualsMenu: React.FC<VisualsMenuProps> = ({ game, onSetGame }) => {
    const visuals = resolveVisuals(game.visuals);

    const updateVisuals = (patch: Partial<VisualsConfiguration>) => {
        onSetGame({ ...game, visuals: { ...visuals, ...patch } });
    };

    return (
        <div className="visuals-menu">
            <h3 className="center-header">Visuals</h3>
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
                    <p className="visuals-property-hint">Transparency of the dialog text panel in the player (0 = fully transparent).</p>
                    <div className="visuals-opacity-control">
                        <Slider
                            min={0}
                            max={100}
                            step={1}
                            value={visuals.dialogTextBackgroundOpacity}
                            onChange={(value) => {
                                const n = typeof value === 'number' ? value : Number(value);
                                if (!Number.isNaN(n)) {
                                    updateVisuals({ dialogTextBackgroundOpacity: n });
                                }
                            }}
                        />
                        <InputNumber
                            min={0}
                            max={100}
                            step={1}
                            value={visuals.dialogTextBackgroundOpacity}
                            onChange={(value) => {
                                if (value === null) {
                                    return;
                                }
                                const n = typeof value === 'number' ? value : Number(value);
                                if (!Number.isNaN(n)) {
                                    updateVisuals({ dialogTextBackgroundOpacity: n });
                                }
                            }}
                        />
                    </div>
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
        </div>
    );
};

export default VisualsMenu;
