import { GameExecManager, DiscussionTopicType } from '../../../exec/GameExecutor';
import { State } from '../../../exec/GameState';
import { RenderView, RenderLink, LocRouteRenderView } from '../../../exec/RenderView';
import { generateImageUrl } from '../../../Utils';

export interface PlayerBridge {
    getExec: () => GameExecManager;
    getState: () => State;
    getView: () => RenderView | null;

    applyState: (s: State) => void;
    requestRestart: () => void;
    requestExit: () => void;

    onLinkClick: (link: RenderLink) => void;
    onRouteClick: (route: LocRouteRenderView) => void;
    onDiscuss: (topicType: DiscussionTopicType, value: string, charUid: string) => void;
    onAdvancePage: () => void;

    events: Phaser.Events.EventEmitter;
}

export const BridgeEvents = {
    RENDER: 'render',
    SHOW_MAIN_MENU: 'showMainMenu',
    HIDE_MAIN_MENU: 'hideMainMenu',
    OPEN_JOURNAL: 'openJournal',
    CLOSE_JOURNAL: 'closeJournal',
    OPEN_DISCUSS: 'openDiscuss',
    CLOSE_DISCUSS: 'closeDiscuss',
} as const;

export function resolveImage(uri: string | undefined | null): string | null {
    if (!uri) return null;
    return generateImageUrl(uri);
}
