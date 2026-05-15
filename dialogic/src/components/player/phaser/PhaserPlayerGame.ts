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
            autoRound: true,
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

    const ensureCanvasStyle = () => {
        const canvas = game.canvas;
        if (!canvas) return;
        canvas.style.position = 'absolute';
        canvas.style.left = '0';
        canvas.style.top = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
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

    const resizeToParent = () => {
        if (destroyed) return;
        // Scale manager is destroyed asynchronously; snapTo is nulled on destroy.
        if (!game.scale || !(game.scale as unknown as { snapTo?: unknown }).snapTo) return;
        const cssW = Math.max(parent.clientWidth || 0, 1);
        const cssH = Math.max(parent.clientHeight || 0, 1);
        game.scale.resize(cssW, cssH);
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

    game.events.once(Phaser.Core.Events.READY, () => {
        if (destroyed) return;
        sceneDefs.forEach(({ key }) => {
            game.scene.start(key, { bridge });
        });
        // Phaser.Scale.RESIZE mode auto-tracks the parent; just kick once
        // after boot in case the parent's initial layout settled late.
        scheduleTimeout(resizeToParent, 50);
    });

    return {
        game,
        destroy: () => {
            destroyed = true;
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
