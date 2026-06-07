import React from 'react';
import { Button, ButtonGroup, Panel, Stack } from 'rsuite';
import FontPicker from '../../common/FontPicker';
import {
    DialogTextAlignment,
    GameDescription,
    ResponseAlignment,
    VisualsConfiguration,
} from '../../../game/GameDescription';
import { resolveVisuals } from '../../player/visualsClasses';

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
        <div style={{ marginLeft: 8, marginRight: 8 }}>
            <h3 className="center-header">Visuals</h3>
            <Stack wrap alignItems="stretch" spacing={16}>
                <Panel bordered header="Typography" style={{ minWidth: '24em' }}>
                    <p>Fonts used in the player UI and dialog.</p>
                    <Stack direction="column" spacing={12}>
                        <FontPicker
                            value={visuals.menuFontId}
                            onChange={(menuFontId) => updateVisuals({ menuFontId })}
                        >
                            Menu font
                        </FontPicker>
                        <FontPicker
                            value={visuals.textFontId}
                            onChange={(textFontId) => updateVisuals({ textFontId })}
                        >
                            Text font
                        </FontPicker>
                        <FontPicker
                            value={visuals.responsesFontId}
                            onChange={(responsesFontId) => updateVisuals({ responsesFontId })}
                        >
                            Responses font
                        </FontPicker>
                    </Stack>
                </Panel>
                <Panel bordered header="Dialog text placement" style={{ minWidth: '24em' }}>
                    <p>Where the dialog text panel appears in the player.</p>
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
                </Panel>
                <Panel bordered header="Response alignment" style={{ minWidth: '24em' }}>
                    <p>How choice buttons are laid out in the player.</p>
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
                </Panel>
                <Panel bordered header="Short history" style={{ minWidth: '24em' }}>
                    <p>Show recent dialog exchanges above the current line in the player.</p>
                    <ButtonGroup>
                        <Button
                            active={visuals.shortHistoryVisible}
                            onClick={() => updateVisuals({ shortHistoryVisible: true })}
                        >
                            Enabled
                        </Button>
                        <Button
                            active={!visuals.shortHistoryVisible}
                            onClick={() => updateVisuals({ shortHistoryVisible: false })}
                        >
                            Disabled
                        </Button>
                    </ButtonGroup>
                </Panel>
            </Stack>
        </div>
    );
};

export default VisualsMenu;
