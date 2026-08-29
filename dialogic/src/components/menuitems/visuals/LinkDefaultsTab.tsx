import React, { useState } from 'react';
import { Button, InputNumber, Slider, Toggle } from 'rsuite';
import {
    DEFAULT_VISITED_LINK_OPACITY,
    LinkCategoryStyle,
    LinkDefaultsConfiguration,
    VisualsConfiguration,
} from '../../../game/GameDescription';
import {
    LINK_TYPES,
    LINK_TYPE_LABELS,
    LinkType,
} from '../../../game/Dialog';
import {
    linkCategoryCssVars,
    linkVisitedCssVars,
    playerVisualsCssVars,
} from '../../player/visualsClasses';
import IconSvg from '../../common/IconSvg';
import LinkStyleForm, { LinkColorRow } from './LinkStyleForm';
import '../../player/player.css';
import './LinkCategoriesTab.css';
import './LinkDefaultsTab.css';

interface LinkDefaultsTabProps {
    visuals: VisualsConfiguration;
    updateVisuals: (patch: Partial<VisualsConfiguration>) => void;
}

const TYPE_HINTS: Record<LinkType, string> = {
    [LinkType.Local]: 'Moves to another window of the same dialog — the bread-and-butter conversation choice.',
    [LinkType.Push]: 'Goes one level deeper (a sub-dialog) and remembers the way back.',
    [LinkType.Pop]: 'Steps one level back out. A good candidate for a quieter "back" look.',
    [LinkType.Jump]: 'Jumps to another dialog/window, keeping the stack.',
    [LinkType.ResetJump]: 'Jumps to another dialog/window and clears the stack — usually a scene change.',
    [LinkType.NavigateToLocation]: 'Travels to a location. Often styled as a distinct "go somewhere" button.',
    [LinkType.TalkToPerson]: 'Starts a dialog with a character.',
    [LinkType.QuickReply]: 'Says a line without leaving the window.',
    [LinkType.Return]: 'Returns to the current location or NPC.',
};

/** Sample label per direction type, used by the live preview. */
const PREVIEW_LABELS: Record<LinkType, string> = {
    [LinkType.Local]: 'Ask about the letter',
    [LinkType.Push]: 'Look closer at the desk',
    [LinkType.Pop]: 'Back',
    [LinkType.Jump]: 'Cut to the next scene',
    [LinkType.ResetJump]: 'Begin the second chapter',
    [LinkType.NavigateToLocation]: 'Go to the harbour',
    [LinkType.TalkToPerson]: 'Talk to the innkeeper',
    [LinkType.QuickReply]: '"Not a chance."',
    [LinkType.Return]: 'Leave the conversation',
};

const DEFAULT_VISITED_COLOR = '#9a9a9a';

const LinkDefaultsTab: React.FC<LinkDefaultsTabProps> = ({ visuals, updateVisuals }) => {
    const [selected, setSelected] = useState<LinkType>(LinkType.Local);
    const defaults = visuals.linkDefaults;
    const style: LinkCategoryStyle = defaults.directionTypes[selected] ?? {};

    const patchDefaults = (patch: Partial<LinkDefaultsConfiguration>) => {
        updateVisuals({ linkDefaults: { ...defaults, ...patch } });
    };

    const writeStyle = (next: LinkCategoryStyle) => {
        patchDefaults({ directionTypes: { ...defaults.directionTypes, [selected]: next } });
    };

    const isCustomized = Object.keys(style).length > 0;

    const typePreviewVars = {
        ...playerVisualsCssVars(visuals),
        ...linkCategoryCssVars(style, style.textColor),
    };

    const visitedPreviewVars = {
        ...playerVisualsCssVars(visuals),
        ...linkVisitedCssVars(defaults),
    };

    return (
        <div className="visuals-properties">
            <div>
                <p className="editor-label">Style links by what they do</p>
                <p className="visuals-property-hint">
                    Links that were never given a category fall into <i>default</i>. With this on, such a link is
                    styled by its direction type instead — so every "go to location" button can look alike without
                    tagging them one by one. A link that <i>does</i> carry a category keeps that category's look.
                </p>
                <div className="link-defaults-toggle-row">
                    <Toggle
                        checked={defaults.byDirectionType}
                        onChange={(byDirectionType) => patchDefaults({ byDirectionType })}
                        data-testid="link-defaults-by-type-toggle"
                    />
                    <span>{defaults.byDirectionType ? 'Direction type styling is on' : 'Off — uncategorized links use the "default" category'}</span>
                </div>
            </div>

            <div className={defaults.byDirectionType ? undefined : 'link-defaults-disabled-section'}>
                <p className="editor-label">Direction type</p>
                <div className="link-category-tabs" data-testid="link-type-tabs">
                    {LINK_TYPES.map((linkType) => {
                        const customized = Object.keys(defaults.directionTypes[linkType] ?? {}).length > 0;
                        return (
                            <Button
                                key={linkType}
                                size="xs"
                                appearance={selected === linkType ? 'primary' : 'default'}
                                onClick={() => setSelected(linkType)}
                                data-testid={`link-type-tab-${linkType}`}
                            >
                                {LINK_TYPE_LABELS[linkType]}
                                {customized && <span className="link-category-dot" />}
                            </Button>
                        );
                    })}
                </div>
                <p className="visuals-property-hint link-category-description">{TYPE_HINTS[selected]}</p>

                <p className="editor-label">Live preview</p>
                <div className="link-category-preview" data-testid="link-type-preview">
                    <button className={`dialog-button dialog-button--type-${selected}`} style={typePreviewVars}>
                        <span className="dialog-link-label dialog-link-label--icon-before">
                            {style.iconId && <IconSvg iconId={style.iconId} className="dialog-link-icon" size={18} />}
                            <span className="dialog-link-text">{PREVIEW_LABELS[selected]}</span>
                        </span>
                    </button>
                </div>

                <LinkStyleForm
                    style={style}
                    onChange={writeStyle}
                    testIdPrefix="link-type"
                    iconHint="Shown before the label on every uncategorized link of this direction type. A link that carries its own icon overrides it."
                />

                <div>
                    <Button
                        appearance="subtle"
                        disabled={!isCustomized}
                        onClick={() => writeStyle({})}
                        data-testid="link-type-reset"
                    >
                        Reset "{LINK_TYPE_LABELS[selected]}" to the default look
                    </Button>
                </div>
            </div>

            <div className="link-defaults-separator" />

            <div>
                <p className="editor-label">Links leading somewhere already visited</p>
                <p className="visuals-property-hint">
                    Dims (and optionally recolours) a link whose target the player has already seen: a dialog window
                    they have been in, a location they have stood in, or a character they have talked to. Applies on
                    top of any category or direction-type look. Only the link's main direction is checked, so an
                    alternative direction does not change it.
                </p>
                <div className="link-defaults-toggle-row">
                    <Toggle
                        checked={defaults.markVisited}
                        onChange={(markVisited) => patchDefaults({ markVisited })}
                        data-testid="link-defaults-visited-toggle"
                    />
                    <span>{defaults.markVisited ? 'Visited links are marked' : 'Off — visited links look like any other'}</span>
                </div>
            </div>

            <div className={defaults.markVisited ? undefined : 'link-defaults-disabled-section'}>
                <p className="editor-label">Opacity</p>
                <div className="visuals-opacity-control" data-testid="link-defaults-visited-opacity">
                    <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={defaults.visitedOpacity}
                        onChange={(v) => patchDefaults({ visitedOpacity: Number(v) })}
                    />
                    <InputNumber
                        min={0}
                        max={100}
                        step={1}
                        value={defaults.visitedOpacity}
                        onChange={(v) => {
                            const n = typeof v === 'number' ? v : Number(v);
                            if (!Number.isNaN(n)) patchDefaults({ visitedOpacity: n });
                        }}
                    />
                </div>

                <LinkColorRow
                    label="Text color"
                    testId="link-defaults-visited-color"
                    value={defaults.visitedTextColor}
                    fallbackHex={DEFAULT_VISITED_COLOR}
                    onChange={(visitedTextColor) => patchDefaults({ visitedTextColor })}
                    onClear={() => patchDefaults({ visitedTextColor: undefined })}
                />

                <p className="editor-label">Live preview</p>
                <div className="link-category-preview link-defaults-preview-pair" data-testid="link-defaults-visited-preview">
                    <button className="dialog-button" style={playerVisualsCssVars(visuals)}>
                        <span className="dialog-link-label dialog-link-label--icon-before">
                            <span className="dialog-link-text">Open the sealed door</span>
                        </span>
                    </button>
                    <button className="dialog-button dialog-button--visited" style={visitedPreviewVars}>
                        <span className="dialog-link-label dialog-link-label--icon-before">
                            <span className="dialog-link-text">Return to the entrance hall</span>
                        </span>
                    </button>
                </div>

                <div>
                    <Button
                        appearance="subtle"
                        disabled={defaults.visitedOpacity === DEFAULT_VISITED_LINK_OPACITY && !defaults.visitedTextColor}
                        onClick={() => patchDefaults({
                            visitedOpacity: DEFAULT_VISITED_LINK_OPACITY,
                            visitedTextColor: undefined,
                        })}
                        data-testid="link-defaults-visited-reset"
                    >
                        Reset the visited look
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default LinkDefaultsTab;
