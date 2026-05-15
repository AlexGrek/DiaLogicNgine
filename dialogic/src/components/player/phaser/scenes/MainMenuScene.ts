import Phaser from 'phaser';
import { BridgeEvents, PlayerBridge } from '../types';
import { createButton, fadeIn, fadeOut, PhaserButton } from '../uiHelpers';

export const MAIN_MENU_SCENE = 'MainMenuScene';

export class MainMenuScene extends Phaser.Scene {
    private bridge!: PlayerBridge;
    private root!: Phaser.GameObjects.Container;
    private visible = true;
    private buttons: PhaserButton[] = [];

    constructor() {
        super(MAIN_MENU_SCENE);
    }

    init(data: { bridge: PlayerBridge }) {
        this.bridge = data.bridge;
    }

    create() {
        this.root = this.add.container(0, 0);
        this.root.setDepth(100);
        this.build();

        this.bridge.events.on(BridgeEvents.SHOW_MAIN_MENU, this.handleShow, this);
        this.bridge.events.on(BridgeEvents.HIDE_MAIN_MENU, this.handleHide, this);
        this.scale.on('resize', this.relayout, this);
    }

    private handleShow = () => {
        if (this.visible) return;
        this.visible = true;
        this.root.setVisible(true);
        this.build();
    };

    private handleHide = () => {
        if (!this.visible) return;
        this.visible = false;
        const objs = this.root.list;
        fadeOut(this, objs as Phaser.GameObjects.GameObject[], 200, () => {
            this.root.removeAll(true);
            this.root.setVisible(false);
        });
    };

    private build() {
        this.root.removeAll(true);
        this.buttons = [];

        const { width, height } = this.scale.gameSize;

        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.55);
        overlay.setOrigin(0, 0);
        this.root.add(overlay);

        const game = this.bridge.getExec().game;
        const title = this.add.text(width / 2, height * 0.28, game.general.name || 'DiaLogicNgine', {
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '64px',
            color: '#f5f7fb',
            fontStyle: 'bold',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(0.5, 0.5);
        this.root.add(title);

        if (game.general.description) {
            const subtitle = this.add.text(width / 2, height * 0.36, game.general.description, {
                fontFamily: 'Inter',
                fontSize: '18px',
                color: '#b8c2d6',
                align: 'center',
                wordWrap: { width: Math.min(700, width - 80) },
            }).setOrigin(0.5, 0.5);
            this.root.add(subtitle);
        }

        const buttonY = height * 0.52;
        const buttonSpacing = 60;
        const buttonW = 260;

        const startBtn = createButton(this, width / 2 - buttonW / 2, buttonY, '▶  New Game', () => {
            this.bridge.events.emit(BridgeEvents.HIDE_MAIN_MENU);
        }, {
            paddingX: 22, paddingY: 14, fontSize: 22,
            minWidth: buttonW, maxWidth: buttonW, align: 'center',
            bg: 0x1c2a45, bgHover: 0x2e4670, border: 0x4c6da0,
        });
        const continueBtn = createButton(this, width / 2 - buttonW / 2, buttonY + buttonSpacing, '↪  Continue', () => {
            this.bridge.events.emit(BridgeEvents.HIDE_MAIN_MENU);
        }, {
            paddingX: 22, paddingY: 14, fontSize: 18,
            minWidth: buttonW, maxWidth: buttonW, align: 'center',
            bg: 0x14223a, bgHover: 0x274068, border: 0x3b5070,
        });
        const exitBtn = createButton(this, width / 2 - buttonW / 2, buttonY + buttonSpacing * 2, 'Exit', () => {
            this.bridge.requestExit();
        }, {
            paddingX: 22, paddingY: 14, fontSize: 16,
            minWidth: buttonW, maxWidth: buttonW, align: 'center',
            bg: 0x100a0a, bgHover: 0x2a1414, border: 0x5b2020, textColor: '#e0a4a4',
        });

        this.buttons = [startBtn, continueBtn, exitBtn];
        this.buttons.forEach(b => this.root.add(b.container));

        const footer = this.add.text(width / 2, height - 30,
            `v${game.general.version || '0.0.0'}  •  Phaser Edition`, {
            fontFamily: 'Inter',
            fontSize: '12px',
            color: '#6c7894',
        }).setOrigin(0.5, 0.5);
        this.root.add(footer);

        fadeIn(this, overlay, 300);
        title.setAlpha(0);
        title.setScale(0.9);
        this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 600, ease: 'Cubic.easeOut' });

        this.buttons.forEach((b, i) => {
            b.container.setAlpha(0);
            this.tweens.add({
                targets: b.container,
                alpha: 1,
                x: { from: b.container.x - 20, to: b.container.x },
                duration: 400,
                delay: 200 + i * 100,
                ease: 'Cubic.easeOut',
            });
        });
    }

    private relayout = () => {
        if (this.visible) this.build();
    };

    shutdown() {
        this.bridge.events.off(BridgeEvents.SHOW_MAIN_MENU, this.handleShow, this);
        this.bridge.events.off(BridgeEvents.HIDE_MAIN_MENU, this.handleHide, this);
        this.scale.off('resize', this.relayout, this);
    }
}
