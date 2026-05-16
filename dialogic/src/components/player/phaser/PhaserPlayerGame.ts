import Phaser from 'phaser';
import { PlayerBridge } from './types';
import { BG_SCENE, BackgroundScene } from './scenes/BackgroundScene';
import { HUD_SCENE, HudScene } from './scenes/HudScene';
import { MAIN_MENU_SCENE, MainMenuScene } from './scenes/MainMenuScene';
import { JOURNAL_SCENE, JournalScene } from './scenes/JournalScene';
import { DISCUSS_SCENE, DiscussScene } from './scenes/DiscussScene';

export interface PhaserPlayerGameHandle {
    game: Phaser.Game;
    destroy: () => void;
}

export function createPhaserPlayerGame(parent: HTMLElement, bridge: PlayerBridge): PhaserPlayerGameHandle {
    const initialW = Math.max(parent.clientWidth || 0, 1);
    const initialH = Math.max(parent.clientHeight || 0, 1);

    const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        parent,
        backgroundColor: '#05080f',
        scale: {
            mode: Phaser.Scale.RESIZE,
            parent,
            width: initialW,
            height: initialH,
            autoRound: false,
        },
        input: {
            mouse: { target: undefined, preventDefaultWheel: false },
            touch: { target: undefined },
            windowEvents: false,
        },
        dom: { createContainer: false },
        fps: { target: 60 },
        render: {
            antialias: true,
            antialiasGL: true,
            pixelArt: false,
            roundPixels: false,
        },
    };

    const game = new Phaser.Game(config);

    // Style the canvas for positioning, but never override width/height — Phaser's
    // ScaleManager sets those itself, and overriding them desyncs the canvas's
    // displayed (CSS) size from its internal pixel size, which breaks pointer
    // hit-testing (clicks land on wrong elements).
    const ensureCanvasStyle = () => {
        const canvas = game.canvas;
        if (!canvas) return;
        canvas.style.position = 'absolute';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.display = 'block';
        canvas.style.touchAction = 'none';
        canvas.style.zIndex = '1';
        canvas.style.pointerEvents = 'auto';
        canvas.style.outline = 'none';
    };
    ensureCanvasStyle();

    let destroyed = false;
    const pendingTimeouts = new Set<number>();
    const scheduleTimeout = (fn: () => void, ms: number) => {
        const id = window.setTimeout(() => {
            pendingTimeouts.delete(id);
            if (destroyed) return;
            fn();
        }, ms);
        pendingTimeouts.add(id);
        return id;
    };

    // Boost canvas backing-store resolution to physical pixels for crisp rendering
    // on HiDPI displays. Phaser sets canvas.width = baseSize (logical px) on every
    // resize, so we override after each resize and tell the WebGL renderer about
    // the larger drawing buffer. CSS dims stay at logical px so the visible size
    // matches the parent.
    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    const applyHiDpi = () => {
        if (dpr <= 1) return;
        const canvas = game.canvas;
        const renderer = game.renderer as unknown as {
            width?: number;
            height?: number;
            resize?: (w: number, h: number) => void;
            gl?: WebGLRenderingContext;
        };
        if (!canvas) return;
        const cssW = canvas.clientWidth || Math.max(parent.clientWidth, 1);
        const cssH = canvas.clientHeight || Math.max(parent.clientHeight, 1);
        const physW = Math.max(Math.round(cssW * dpr), 1);
        const physH = Math.max(Math.round(cssH * dpr), 1);
        if (canvas.width !== physW || canvas.height !== physH) {
            canvas.width = physW;
            canvas.height = physH;
            canvas.style.width = `${cssW}px`;
            canvas.style.height = `${cssH}px`;
            if (renderer.gl) {
                renderer.gl.viewport(0, 0, physW, physH);
            }
            // Set the renderer's internal width/height to physical so projection
            // math uses the full backing store; cameras (sized to baseSize in
            // logical px) still map their viewport correctly via NDC.
            if (renderer.resize) {
                renderer.resize(physW, physH);
            }
            // Cameras were just resized to physical by renderer.resize — restore
            // them to logical so scene layout (which uses baseSize) stays correct.
            game.scene.scenes.forEach((s) => {
                if (s.cameras && s.cameras.main) {
                    s.cameras.main.setSize(cssW, cssH);
                }
            });
        }
    };

    const resizeToParent = () => {
        if (destroyed) return;
        // Scale manager is destroyed asynchronously; snapTo is nulled on destroy.
        if (!game.scale || !(game.scale as unknown as { snapTo?: unknown }).snapTo) return;
        const cssW = Math.max(parent.clientWidth || 0, 1);
        const cssH = Math.max(parent.clientHeight || 0, 1);
        game.scale.resize(cssW, cssH);
        applyHiDpi();
    };

    const sceneDefs: { key: string; ctor: new () => Phaser.Scene }[] = [
        { key: BG_SCENE, ctor: BackgroundScene },
        { key: HUD_SCENE, ctor: HudScene },
        { key: JOURNAL_SCENE, ctor: JournalScene },
        { key: DISCUSS_SCENE, ctor: DiscussScene },
        { key: MAIN_MENU_SCENE, ctor: MainMenuScene },
    ];

    sceneDefs.forEach(({ key, ctor }) => {
        game.scene.add(key, ctor, false);
    });

    // Phaser's RESIZE mode only auto-tracks window resize events. Use a
    // ResizeObserver so we also reflow when the parent's size changes due to
    // sibling layout shifts, sidebar toggles, etc.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resizeToParent()) : null;
    if (ro) ro.observe(parent);

    game.events.once(Phaser.Core.Events.READY, () => {
        if (destroyed) return;
        sceneDefs.forEach(({ key }) => {
            game.scene.start(key, { bridge });
        });
        // Kick once after boot in case the parent's initial layout settled late
        // and to apply HiDPI scaling now that the renderer/canvas exist.
        scheduleTimeout(resizeToParent, 50);
    });

    return {
        game,
        destroy: () => {
            destroyed = true;
            if (ro) ro.disconnect();
            pendingTimeouts.forEach((id) => window.clearTimeout(id));
            pendingTimeouts.clear();
            try {
                game.destroy(true, false);
            } catch (e) {
                console.error('Phaser game destroy failed', e);
            }
        },
    };
}
