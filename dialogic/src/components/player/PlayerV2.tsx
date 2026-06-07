import React, { useEffect, useMemo, useRef, useState } from 'react';
import Phaser from 'phaser';
import { IUpds } from '../../App';
import { DiscussionTopicType, GameExecManager } from '../../exec/GameExecutor';
import { State, createInitialState } from '../../exec/GameState';
import { RenderView, RenderLink, LocRouteRenderView } from '../../exec/RenderView';
import { GameDescription } from '../../game/GameDescription';
import { BridgeEvents, PlayerBridge } from './phaser/types';
import { createPhaserPlayerGame, PhaserPlayerGameHandle } from './phaser/PhaserPlayerGame';

interface PlayerV2Props {
    game: GameDescription;
    handlers?: IUpds;
}

const PlayerV2: React.FC<PlayerV2Props> = ({ game }) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const phaserHandleRef = useRef<PhaserPlayerGameHandle | null>(null);
    const eventsRef = useRef<Phaser.Events.EventEmitter>(new Phaser.Events.EventEmitter());

    const [exec, setExec] = useState<GameExecManager>(() => new GameExecManager(game));
    const [state, setState] = useState<State>(() => createInitialState(game));
    const stateRef = useRef<State>(state);
    const viewRef = useRef<RenderView | null>(null);
    const oldBgRef = useRef<string | null>(null);
    const startedRef = useRef<boolean>(false);

    useEffect(() => { stateRef.current = state; }, [state]);

    useEffect(() => {
        const m = new GameExecManager(game);
        setExec(m);
        setState(createInitialState(game));
        oldBgRef.current = null;
        startedRef.current = false;
    }, [game]);

    const bridge: PlayerBridge = useMemo(() => ({
        getExec: () => exec,
        getState: () => stateRef.current,
        getView: () => viewRef.current,
        applyState: (s: State) => setState(s),
        requestRestart: () => {
            startedRef.current = false;
            oldBgRef.current = null;
            setState(createInitialState(game));
            eventsRef.current.emit(BridgeEvents.SHOW_MAIN_MENU);
        },
        requestExit: () => {
            window.history.length > 1 ? window.history.back() : window.location.assign('/');
        },
        onLinkClick: (link: RenderLink) => {
            const widget = viewRef.current?.uiWidgetView;
            let prevText = '';
            if (widget && (widget.widget === 'dialog' || widget.widget === 'location' || widget.widget === 'char')) {
                prevText = widget.text || '';
            }
            const clickData = { actor: null, text: prevText, answer: link.text, step: stateRef.current.stepCount };
            try {
                const next = exec.dialogVariantApply(stateRef.current, link.link, clickData);
                stateRef.current = next;
                setState(next);
            } catch (e) {
                console.error('onLinkClick failed', e);
            }
        },
        onRouteClick: (route: LocRouteRenderView) => {
            try {
                const next = exec.locRouteApply(stateRef.current, route);
                stateRef.current = next;
                setState(next);
            } catch (e) {
                console.error('onRouteClick failed', e);
            }
        },
        onDiscuss: (topicType: DiscussionTopicType, value: string, charUid: string) => {
            try {
                const next = exec.discuss(stateRef.current, topicType, value, charUid);
                stateRef.current = next;
                setState(next);
            } catch (e) {
                console.error('onDiscuss failed', e);
            }
        },
        onAdvancePage: () => {
            const widget = viewRef.current?.uiWidgetView;
            let blockText = '';
            if (widget && (widget.widget === 'dialog' || widget.widget === 'char')) {
                blockText = widget.text || '';
            }
            try {
                const next = exec.advanceDialogPage(stateRef.current, blockText);
                stateRef.current = next;
                setState(next);
            } catch (e) {
                console.error('onAdvancePage failed', e);
            }
        },
        events: eventsRef.current,
    }), [exec, game]);

    useEffect(() => {
        if (!containerRef.current) return;
        if (phaserHandleRef.current) return;
        const h = createPhaserPlayerGame(containerRef.current, bridge);
        phaserHandleRef.current = h;

        const id = window.setTimeout(() => {
            if (!startedRef.current) {
                eventsRef.current.emit(BridgeEvents.SHOW_MAIN_MENU);
            }
        }, 50);

        return () => {
            window.clearTimeout(id);
            h.destroy();
            phaserHandleRef.current = null;
        };
    }, [bridge]);

    useEffect(() => {
        try {
            const view = exec.renderer.render(state, oldBgRef.current);
            viewRef.current = view;
            if (view.backgroundChange) {
                oldBgRef.current = view.backgroundChange.nextbg;
            }
            eventsRef.current.emit(BridgeEvents.RENDER, view);
        } catch (e) {
            console.error('Render failed', e);
        }
    }, [state, exec]);

    useEffect(() => {
        const emitter = eventsRef.current;
        const handler = () => { startedRef.current = true; };
        emitter.on(BridgeEvents.HIDE_MAIN_MENU, handler);
        return () => { emitter.off(BridgeEvents.HIDE_MAIN_MENU, handler); };
    }, []);

    return (
        <div
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: 0,
                flex: '1 1 auto',
                overflow: 'hidden',
            }}
        >
            <div
                ref={containerRef}
                style={{
                    position: 'absolute',
                    inset: 0,
                    overflow: 'hidden',
                    background: '#05080f',
                }}
            />
        </div>
    );
};

export default PlayerV2;
