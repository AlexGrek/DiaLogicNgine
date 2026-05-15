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

    const resizeToParent = () => {
        const cssW = Math.max(parent.clientWidth || 0, 1);
        const cssH = Math.max(parent.clientHeight || 0, 1);
        game.scale.resize(cssW, cssH);
    };

    let ro: ResizeObserver | null = null;
    const onWindowResize = () => resizeToParent();
    if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(() => resizeToParent());
        ro.observe(parent);
    }
    window.addEventListener('resize', onWindowResize);

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
        sceneDefs.forEach(({ key }) => {
            game.scene.start(key, { bridge });
        });
        resizeToParent();
        setTimeout(resizeToParent, 50);
    });

    return {
        game,
        destroy: () => {
            try {
                if (ro) ro.disconnect();
                window.removeEventListener('resize', onWindowResize);
                game.destroy(true, false);
            } catch { /* noop */ }
        },
    };
}
