import React from 'react';
import { Button, ButtonGroup, Toggle } from 'rsuite';
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
