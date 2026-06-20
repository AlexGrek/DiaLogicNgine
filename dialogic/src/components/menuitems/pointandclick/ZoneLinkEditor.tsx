import React from 'react';
import { ButtonToolbar, Input, Panel, Toggle, Tooltip, Whisper } from 'rsuite';
import { IUpds } from '../../../App';
import { createDialogWindowId } from '../../../exec/GameState';
import { DialogLinkDirection, LinkType } from '../../../game/Dialog';
import { GameDescription } from '../../../game/GameDescription';
import { PointAndClickZone } from '../../../game/PointAndClick';
import ButtonPanelSelector from '../../ButtonPanelSelector';
import LinkTypeTag from '../../LinkTypeTag';
import CharPicker from '../../linkedit/CharPicker';
import LocationPicker from '../../linkedit/LocationPicker';
import DialogWindowPicker from '../../common/DialogWindowPicker';

interface ZoneLinkEditorProps {
    zone: PointAndClickZone;
    game: GameDescription;
    handlers: IUpds;
    onChange: (updates: Partial<PointAndClickZone>) => void;
}

const TYPE_TOOLTIPS: { [key: string]: string } = {
    [LinkType.Local]: 'Local: move to another window in the dialog that hosts this scene',
    [LinkType.Pop]: 'Pop: go one level back (or to the location), popping the stack',
    [LinkType.Push]: 'Push: open another dialog window, pushing the stack',
    [LinkType.NavigateToLocation]: 'Loc: travel to a location, clearing the stack',
    [LinkType.TalkToPerson]: 'Talk: open an NPC discussion, pushing the stack',
    [LinkType.Jump]: 'Jump: move to another dialog window, keeping the stack',
    [LinkType.ResetJump]: 'ResetJump: move to another dialog window, clearing the stack',
    [LinkType.QuickReply]: 'Reply: show quick reply text without changing window',
    [LinkType.Return]: 'Return: return to the location or NPC dialog',
};

const ALL_TYPES = Object.values(LinkType);

/** Build a fresh direction for a newly chosen link type, with sensible defaults. */
function directionForType(type: LinkType, game: GameDescription): DialogLinkDirection {
    switch (type) {
        case LinkType.Push:
        case LinkType.Jump:
        case LinkType.ResetJump:
            return { type, qualifiedDirection: game.startupDialog };
        case LinkType.QuickReply:
            return { type, replyText: '' };
        default:
            return { type, direction: '' };
    }
}

/**
 * Edits a point-and-click zone's navigation — the same set of directions a
 * dialog variant supports. The zone's `onClickScript` acts as the link action,
 * so this editor only deals with where the click goes.
 */
const ZoneLinkEditor: React.FC<ZoneLinkEditorProps> = ({ zone, game, handlers, onChange }) => {
    const navigates = zone.mainDirection !== undefined;

    const setNavigates = (on: boolean) => {
        if (on) {
            onChange({ mainDirection: directionForType(LinkType.Push, game) });
        } else {
            onChange({ mainDirection: undefined, alternativeDirections: undefined, useAlternativeWhen: undefined });
        }
    };

    const altEnabled = (zone.alternativeDirections?.length ?? 0) > 0;

    const setAltEnabled = (on: boolean) => {
        if (on) {
            onChange({ alternativeDirections: [directionForType(LinkType.Local, game)] });
        } else {
            onChange({ alternativeDirections: undefined, useAlternativeWhen: undefined });
        }
    };

    const typeButtons = ALL_TYPES.map((key) => (
        <Whisper key={key} placement="top" trigger="hover" speaker={<Tooltip>{TYPE_TOOLTIPS[key]}</Tooltip>}>
            <span><LinkTypeTag value={key} /></span>
        </Whisper>
    ));

    const directionEditor = (dir: DialogLinkDirection, onDirChange: (d: DialogLinkDirection) => void) => {
        const target = () => {
            if (dir.type === LinkType.Local) {
                return (
                    <Input
                        value={dir.direction || ''}
                        onChange={(value) => onDirChange({ ...dir, direction: value })}
                        placeholder="Target window uid (in the hosting dialog)"
                    />
                );
            }
            if (dir.type === LinkType.Push || dir.type === LinkType.Jump || dir.type === LinkType.ResetJump) {
                const qd = dir.qualifiedDirection ?? game.startupDialog;
                return (
                    <DialogWindowPicker
                        handlers={handlers}
                        dialogs={game.dialogs}
                        chosen={[qd.dialog, qd.window]}
                        onValueChange={(d, w) =>
                            d && w ? onDirChange({ ...dir, qualifiedDirection: createDialogWindowId(d, w) }) : undefined
                        }
                    />
                );
            }
            if (dir.type === LinkType.NavigateToLocation) {
                return (
                    <LocationPicker
                        locs={game.locs}
                        value={dir.direction || ''}
                        onLocChange={(value) => onDirChange({ ...dir, direction: value || '' })}
                    />
                );
            }
            if (dir.type === LinkType.TalkToPerson) {
                return (
                    <CharPicker
                        chars={game.chars}
                        value={dir.direction || ''}
                        onChange={(value) => onDirChange({ ...dir, direction: value || '' })}
                        dialogOnly={true}
                    />
                );
            }
            if (dir.type === LinkType.QuickReply) {
                return (
                    <Input
                        value={dir.replyText || ''}
                        onChange={(value) => onDirChange({ ...dir, replyText: value })}
                        placeholder="Reply text"
                    />
                );
            }
            return null;
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <ButtonToolbar>
                    <ButtonPanelSelector
                        tooltips={TYPE_TOOLTIPS}
                        chosen={dir.type}
                        variants={ALL_TYPES}
                        buttonData={typeButtons}
                        onValueChanged={(type) => onDirChange(directionForType(type, game))}
                    />
                </ButtonToolbar>
                {target()}
            </div>
        );
    };

    const setMainDir = (d: DialogLinkDirection) => onChange({ mainDirection: d });
    const setAltDir = (d: DialogLinkDirection) => onChange({ alternativeDirections: [d] });

    return (
        <Panel bordered style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Toggle checked={navigates} onChange={setNavigates} />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>Navigate on click</span>
            </div>
            <p style={{ color: '#888', fontSize: '12px', margin: '6px 0 0' }}>
                When on, clicking this zone follows a link just like a dialog answer. The On Click Script above
                still runs first (as the link action).
            </p>

            {navigates && zone.mainDirection && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {directionEditor(zone.mainDirection, setMainDir)}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Toggle checked={altEnabled} onChange={setAltEnabled} />
                        <span style={{ fontSize: '13px' }}>Use an alternative direction conditionally</span>
                    </div>

                    {altEnabled && zone.alternativeDirections && zone.alternativeDirections[0] && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 500 }}>
                                useAlternativeWhen (script &rarr; boolean)
                            </label>
                            <Input
                                as="textarea"
                                rows={2}
                                value={zone.useAlternativeWhen || ''}
                                onChange={(value) => onChange({ useAlternativeWhen: value || undefined })}
                                placeholder="return ... // when true, follow the alternative direction"
                            />
                            {directionEditor(zone.alternativeDirections[0], setAltDir)}
                        </div>
                    )}
                </div>
            )}
        </Panel>
    );
};

export default ZoneLinkEditor;
