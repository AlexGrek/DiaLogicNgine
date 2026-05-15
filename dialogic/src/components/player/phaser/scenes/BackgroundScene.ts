import Phaser from 'phaser';
import { BridgeEvents, PlayerBridge, resolveImage } from '../types';
import { imageKeyFor, loadImageAsync } from '../uiHelpers';
import { RenderView } from '../../../../exec/RenderView';

export const BG_SCENE = 'BackgroundScene';

export class BackgroundScene extends Phaser.Scene {
    private bridge!: PlayerBridge;
    private currentBg: Phaser.GameObjects.Image | null = null;
    private overlay!: Phaser.GameObjects.Rectangle;
    private currentBgUrl: string | null = null;

    constructor() {
        super(BG_SCENE);
    }

    init(data: { bridge: PlayerBridge }) {
        this.bridge = data.bridge;
    }

    create() {
        const { width, height } = this.scale.gameSize;
        const fallback = this.add.rectangle(0, 0, width, height, 0x0a0e15, 1);
        fallback.setOrigin(0, 0);
        fallback.setData('isFallback', true);

        this.overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.35);
        this.overlay.setOrigin(0, 0);

        this.bridge.events.on(BridgeEvents.RENDER, this.onRender, this);
        this.scale.on('resize', this.onResize, this);

        const view = this.bridge.getView();
        if (view) this.onRender(view);
    }

    private onResize = (gameSize: Phaser.Structs.Size) => {
        const { width, height } = gameSize;
        this.children.list.forEach((child) => {
            if (child.getData && child.getData('isFallback')) {
                (child as Phaser.GameObjects.Rectangle).setSize(width, height);
            }
        });
        this.overlay.setSize(width, height);
        if (this.currentBg) {
            this.fitImage(this.currentBg);
        }
    };

    private fitImage(img: Phaser.GameObjects.Image) {
        const { width, height } = this.scale.gameSize;
        img.setPosition(width / 2, height / 2);
        const sx = width / img.width;
        const sy = height / img.height;
        const scale = Math.max(sx, sy);
        img.setScale(scale);
    }

    private async onRender(view: RenderView) {
        const state = this.bridge.getState();
        const nextUrl = resolveImage(state.background);

        if (nextUrl === this.currentBgUrl) return;
        this.currentBgUrl = nextUrl;

        if (!nextUrl) {
            if (this.currentBg) {
                const old = this.currentBg;
                this.currentBg = null;
                this.tweens.add({ targets: old, alpha: 0, duration: 400, onComplete: () => old.destroy() });
            }
            return;
        }

        const key = imageKeyFor(nextUrl);
        const ok = await loadImageAsync(this, key, nextUrl);
        if (!ok) return;
        if (this.currentBgUrl !== nextUrl) return;

        const newImg = this.add.image(0, 0, key);
        newImg.setAlpha(0);
        newImg.setDepth(0);
        this.fitImage(newImg);

        const old = this.currentBg;
        this.currentBg = newImg;

        const effect = view.backgroundChange?.effect;
        const duration = effect === 'slow' ? 900 : 500;

        this.tweens.add({ targets: newImg, alpha: 1, duration });
        if (old) {
            this.tweens.add({ targets: old, alpha: 0, duration, onComplete: () => old.destroy() });
        }

        this.overlay.setDepth(1);
    }

    shutdown() {
        this.bridge.events.off(BridgeEvents.RENDER, this.onRender, this);
        this.scale.off('resize', this.onResize, this);
    }
}
