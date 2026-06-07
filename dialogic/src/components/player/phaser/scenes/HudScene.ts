import Phaser from 'phaser';
import { BridgeEvents, PlayerBridge, resolveImage } from '../types';
import { createButton, fadeIn, fadeOut, imageKeyFor, loadImageAsync, PhaserButton } from '../uiHelpers';
import { DialogTypewriter } from '../typewriter';
import {
    CharDialogRenderView,
    DialogRenderView,
    ErrorView,
    LocationRenderView,
    PacRenderView,
    RenderLink,
    RenderView,
    RenderWidget,
} from '../../../../exec/RenderView';

export const HUD_SCENE = 'HudScene';

export class HudScene extends Phaser.Scene {
    private bridge!: PlayerBridge;
    private root!: Phaser.GameObjects.Container;
    private menuBar!: Phaser.GameObjects.Container;
    private menuButtons: PhaserButton[] = [];
    private active = false;
    private busy = false;
    private pendingView: RenderView | null = null;
    private lastWidget: RenderWidget | null = null;
    private resizeHandler!: (gameSize: Phaser.Structs.Size) => void;
    private activeTypewriter: DialogTypewriter | null = null;
    private interactionZone: Phaser.GameObjects.Rectangle | null = null;

    constructor() {
        super(HUD_SCENE);
    }

    init(data: { bridge: PlayerBridge }) {
        this.bridge = data.bridge;
    }

    create() {
        this.root = this.add.container(0, 0);
        this.root.setDepth(10);

        this.menuBar = this.add.container(0, 0);
        this.menuBar.setDepth(20);

        this.buildMenuBar();

        this.bridge.events.on(BridgeEvents.RENDER, this.onRender, this);
        this.bridge.events.on(BridgeEvents.SHOW_MAIN_MENU, this.handleHide, this);
        this.bridge.events.on(BridgeEvents.HIDE_MAIN_MENU, this.handleShow, this);
        this.bridge.events.on(BridgeEvents.OPEN_JOURNAL, this.handleHide, this);
        this.bridge.events.on(BridgeEvents.CLOSE_JOURNAL, this.handleShow, this);
        this.bridge.events.on(BridgeEvents.OPEN_DISCUSS, this.handleHide, this);
        this.bridge.events.on(BridgeEvents.CLOSE_DISCUSS, this.handleShow, this);

        this.resizeHandler = () => this.layoutMenuBar();
        this.scale.on('resize', this.resizeHandler);

        this.root.setVisible(false);
        this.menuBar.setVisible(false);
    }

    private handleShow = () => {
        this.active = true;
        this.root.setVisible(true);
        this.menuBar.setVisible(true);
        const view = this.bridge.getView();
        if (view) this.onRender(view);
    };

    private handleHide = () => {
        this.active = false;
        this.pendingView = null;
        this.root.setVisible(false);
        this.menuBar.setVisible(false);
    };

    private buildMenuBar() {
        this.menuButtons.forEach(b => b.destroy());
        this.menuButtons = [];

        const journalBtn = createButton(this, 0, 0, 'Journal', () => {
            this.bridge.events.emit(BridgeEvents.OPEN_JOURNAL, 'objectives');
        }, { paddingX: 14, paddingY: 8, fontSize: 14, bg: 0x1c2535, align: 'center' });
        const factsBtn = createButton(this, 0, 0, 'Facts', () => {
            this.bridge.events.emit(BridgeEvents.OPEN_JOURNAL, 'facts');
        }, { paddingX: 14, paddingY: 8, fontSize: 14, bg: 0x1c2535, align: 'center' });
        const peopleBtn = createButton(this, 0, 0, 'People', () => {
            this.bridge.events.emit(BridgeEvents.OPEN_JOURNAL, 'people');
        }, { paddingX: 14, paddingY: 8, fontSize: 14, bg: 0x1c2535, align: 'center' });
        const menuBtn = createButton(this, 0, 0, 'Menu', () => {
            this.bridge.requestRestart();
        }, { paddingX: 14, paddingY: 8, fontSize: 14, bg: 0x1c2535, align: 'center' });

        this.menuButtons = [journalBtn, factsBtn, peopleBtn, menuBtn];
        this.menuButtons.forEach(b => this.menuBar.add(b.container));
        this.layoutMenuBar();
    }

    private layoutMenuBar() {
        const { width } = this.scale.gameSize;
        const pad = 12;
        let x = width - pad;
        for (let i = this.menuButtons.length - 1; i >= 0; i--) {
            const b = this.menuButtons[i];
            x -= b.width;
            b.container.setPosition(x, pad);
            x -= 8;
        }
    }

    private onRender = async (view: RenderView) => {
        if (!this.active) return;
        if (this.busy) {
            this.pendingView = view;
            return;
        }
        this.busy = true;
        try {
            await this.renderWidget(view.uiWidgetView);
            this.lastWidget = view.uiWidgetView;
            while (this.pendingView && this.active) {
                const next = this.pendingView;
                this.pendingView = null;
                await this.renderWidget(next.uiWidgetView);
                this.lastWidget = next.uiWidgetView;
            }
        } finally {
            this.busy = false;
        }
    };

    private clearRoot() {
        this.activeTypewriter?.destroy();
        this.activeTypewriter = null;
        this.interactionZone?.destroy();
        this.interactionZone = null;
        this.root.removeAll(true);
    }

    private async renderWidget(widget: RenderWidget) {
        const previous = this.lastWidget;
        if (previous) {
            const survivors = this.root.list;
            if (survivors.length > 0) {
                await new Promise<void>((resolve) => {
                    let done = false;
                    fadeOut(this, survivors as Phaser.GameObjects.GameObject[], 180, () => {
                        if (done) return;
                        done = true;
                        resolve();
                    });
                    this.time.delayedCall(220, () => {
                        if (done) return;
                        done = true;
                        resolve();
                    });
                });
            }
        }
        this.clearRoot();

        switch (widget.widget) {
            case 'dialog':
                await this.renderDialog(widget);
                break;
            case 'location':
                await this.renderLocation(widget);
                break;
            case 'char':
                await this.renderChar(widget);
                break;
            case 'pac':
                this.renderPac(widget);
                break;
            case 'error':
                this.renderError(widget);
                break;
        }
    }

    private getLayout() {
        const { width, height } = this.scale.gameSize;
        const panelMaxW = Math.min(900, width - 80);
        const panelX = (width - panelMaxW) / 2;
        const panelY = Math.min(height - 320, height * 0.45);
        return { width, height, panelMaxW, panelX, panelY };
    }

    private async renderDialog(view: DialogRenderView) {
        const { height, panelMaxW, panelX, panelY } = this.getLayout();

        const panelH = height - panelY - 30;
        const panelBg = this.add.rectangle(panelX, panelY, panelMaxW, panelH, 0x0b1220, 0.85);
        panelBg.setOrigin(0, 0);
        panelBg.setStrokeStyle(1, 0x2f4368, 0.9);
        this.root.add(panelBg);

        let cursorY = panelY + 20;
        const innerX = panelX + 24;
        const innerW = panelMaxW - 48;

        if (view.actor) {
            const actorRow = this.add.container(innerX, cursorY);
            const avatarUrl = resolveImage(view.actor.avatar);
            let avatarW = 0;
            if (avatarUrl) {
                const key = imageKeyFor(avatarUrl);
                const ok = await loadImageAsync(this, key, avatarUrl);
                if (ok) {
                    const img = this.add.image(0, 0, key);
                    img.setOrigin(0, 0);
                    const target = 56;
                    const scale = Math.min(target / img.width, target / img.height);
                    img.setScale(scale);
                    actorRow.add(img);
                    avatarW = target + 12;
                }
            }
            const nameText = this.add.text(avatarW, 14, view.actor.name, {
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '20px',
                color: '#f0c674',
                fontStyle: 'bold',
            });
            actorRow.add(nameText);
            this.root.add(actorRow);
            cursorY += 64;
        }

        const fullText = view.text || '';
        const text = this.add.text(innerX, cursorY, '', {
            fontFamily: 'Inter, Georgia, serif',
            fontSize: '20px',
            color: '#e8edf5',
            wordWrap: { width: innerW, useAdvancedWrap: true },
            lineSpacing: 4,
        });
        this.root.add(text);

        const canAdvance = view.pageIndex < view.pageCount - 1;
        const continueLink = view.continueLink;
        const layoutAfterText = () => {
            const linksY = cursorY + text.height + 24;
            const links = this.renderLinks(view.links, innerX, linksY, innerW);
            links.forEach(c => this.root.add(c));
            if (!canAdvance && !continueLink) {
                this.interactionZone?.destroy();
                this.interactionZone = null;
            }
        };

        this.activeTypewriter = new DialogTypewriter(this, text, fullText, layoutAfterText);
        this.addDialogInteractionZone(canAdvance, continueLink, this.activeTypewriter);

        fadeIn(this, panelBg, 200);
        this.tweens.add({ targets: panelBg, scaleY: { from: 0.98, to: 1 }, duration: 250, ease: 'Cubic.easeOut' });
        text.setAlpha(0);
        this.tweens.add({ targets: text, alpha: 1, y: { from: text.y + 8, to: text.y }, duration: 300, ease: 'Cubic.easeOut', delay: 80 });
        if (view.actor) {
            const actorContainer = this.root.list[1] as Phaser.GameObjects.Container | undefined;
            if (actorContainer) {
                actorContainer.setAlpha(0);
                this.tweens.add({ targets: actorContainer, alpha: 1, duration: 200, delay: 40 });
            }
        }
    }

    private async renderLocation(view: LocationRenderView) {
        const { width, height, panelMaxW, panelX, panelY } = this.getLayout();

        const titleText = this.add.text(width / 2, 70, view.location.displayName || view.location.uid, {
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '34px',
            color: '#f5f7fb',
            fontStyle: 'bold',
        }).setOrigin(0.5, 0.5);
        this.root.add(titleText);

        const routesContainer = this.add.container(0, 130);
        const routePad = 14;
        const routeMaxW = 220;
        const visibleRoutes = view.routes;
        if (visibleRoutes.length > 0) {
            const totalW = visibleRoutes.length * routeMaxW + (visibleRoutes.length - 1) * routePad;
            let rx = (width - totalW) / 2;
            for (let i = 0; i < visibleRoutes.length; i++) {
                const r = visibleRoutes[i];
                const btn = createButton(this, rx, 0, r.name, () => {
                    this.bridge.onRouteClick(r);
                }, {
                    paddingX: 16,
                    paddingY: 14,
                    fontSize: 16,
                    bg: 0x162033,
                    minWidth: routeMaxW,
                    maxWidth: routeMaxW,
                    align: 'center',
                }, r.disabled);
                routesContainer.add(btn.container);
                this.tweens.add({ targets: btn.container, y: { from: -16, to: 0 }, alpha: { from: 0, to: 1 }, duration: 240, delay: 60 + i * 50 });
                rx += routeMaxW + routePad;
            }
        }
        this.root.add(routesContainer);

        const panelH = Math.min(420, height - panelY - 30);
        const panelBg = this.add.rectangle(panelX, panelY, panelMaxW, panelH, 0x0b1220, 0.85);
        panelBg.setOrigin(0, 0);
        panelBg.setStrokeStyle(1, 0x2f4368, 0.9);
        this.root.add(panelBg);

        const innerX = panelX + 24;
        const innerW = panelMaxW - 48;

        const text = this.add.text(innerX, panelY + 20, view.text || '', {
            fontFamily: 'Inter, Georgia, serif',
            fontSize: '18px',
            color: '#e8edf5',
            wordWrap: { width: innerW, useAdvancedWrap: true },
            lineSpacing: 4,
        });
        this.root.add(text);

        const linksY = panelY + 20 + text.height + 20;
        const links = this.renderLinks(view.links, innerX, linksY, innerW);
        links.forEach(c => this.root.add(c));

        fadeIn(this, [titleText, panelBg], 250);
        text.setAlpha(0);
        this.tweens.add({ targets: text, alpha: 1, duration: 300, delay: 100 });
    }

    private async renderChar(view: CharDialogRenderView) {
        const { height, panelMaxW, panelX, panelY } = this.getLayout();

        const panelH = height - panelY - 30;
        const panelBg = this.add.rectangle(panelX, panelY, panelMaxW, panelH, 0x0b1220, 0.85);
        panelBg.setOrigin(0, 0);
        panelBg.setStrokeStyle(1, 0x2f4368, 0.9);
        this.root.add(panelBg);

        const innerX = panelX + 24;
        const innerW = panelMaxW - 48;
        let cursorY = panelY + 20;

        const char = view.char;
        const avatarUrl = resolveImage(char.avatar?.main);
        let nameOffsetX = 0;
        if (avatarUrl) {
            const key = imageKeyFor(avatarUrl);
            const ok = await loadImageAsync(this, key, avatarUrl);
            if (ok) {
                const img = this.add.image(innerX, cursorY, key);
                img.setOrigin(0, 0);
                const target = 64;
                const scale = Math.min(target / img.width, target / img.height);
                img.setScale(scale);
                this.root.add(img);
                nameOffsetX = target + 14;
            }
        }
        const nameText = this.add.text(innerX + nameOffsetX, cursorY + 18, char.displayName?.main || char.uid, {
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '22px',
            color: '#f0c674',
            fontStyle: 'bold',
        });
        this.root.add(nameText);
        cursorY += 78;

        const fullText = view.text || '';
        const text = this.add.text(innerX, cursorY, '', {
            fontFamily: 'Inter, Georgia, serif',
            fontSize: '20px',
            color: '#e8edf5',
            wordWrap: { width: innerW, useAdvancedWrap: true },
            lineSpacing: 4,
        });
        this.root.add(text);

        const canAdvance = view.pageIndex < view.pageCount - 1;
        const continueLink = view.continueLink;
        const opt = view.dialogOptions;
        const canDiscuss = opt.canDiscussChars || opt.canDiscussFacts || opt.canDiscussItems || opt.canDiscussLocations;
        const textBaseY = cursorY;

        const layoutAfterText = () => {
            let linksY = textBaseY + text.height + 22;
            if (canDiscuss) {
                const discussBtn = createButton(this, innerX, linksY, '» Discuss...', () => {
                    this.bridge.events.emit(BridgeEvents.OPEN_DISCUSS, view);
                }, {
                    paddingX: 14, paddingY: 8, fontSize: 14, bg: 0x1c2535,
                });
                this.root.add(discussBtn.container);
                linksY += discussBtn.height + 12;
            }
            const links = this.renderLinks(view.links, innerX, linksY, innerW);
            links.forEach(c => this.root.add(c));
            if (!canAdvance && !continueLink) {
                this.interactionZone?.destroy();
                this.interactionZone = null;
            }
        };

        this.activeTypewriter = new DialogTypewriter(this, text, fullText, layoutAfterText);
        this.addDialogInteractionZone(canAdvance, continueLink, this.activeTypewriter);

        fadeIn(this, panelBg, 200);
        text.setAlpha(0);
        this.tweens.add({ targets: text, alpha: 1, y: { from: text.y + 8, to: text.y }, duration: 300, ease: 'Cubic.easeOut', delay: 80 });
    }

    private addDialogInteractionZone(
        canAdvance: boolean,
        continueLink: RenderLink | null,
        typewriter: DialogTypewriter | null,
    ) {
        const needsSkip = typewriter != null && !typewriter.isComplete();
        const needsAdvance = canAdvance || continueLink != null;
        if (!needsSkip && !needsAdvance) {
            return;
        }
        const { width, height } = this.scale.gameSize;
        const zone = this.add.rectangle(0, 0, width, height, 0x000000, 0.001).setOrigin(0, 0);
        zone.setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => {
            if (typewriter?.skip()) {
                return;
            }
            if (continueLink) {
                this.bridge.onLinkClick(continueLink);
            } else if (canAdvance) {
                this.bridge.onAdvancePage();
            }
        });
        this.root.add(zone);
        this.interactionZone = zone;

        const showHint = needsAdvance && (typewriter?.isComplete() ?? true);
        if (showHint) {
            const hint = this.add.text(width / 2, height - 18, '▼ click to continue', {
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '14px',
                color: '#9fb3d1',
            }).setOrigin(0.5, 1);
            this.root.add(hint);
            hint.setAlpha(0);
            this.tweens.add({ targets: hint, alpha: { from: 0, to: 0.85 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
    }

    private renderPac(view: PacRenderView) {
        const { width, height } = this.scale.gameSize;
        const title = this.add.text(width / 2, height / 2, `Point-and-click: ${view.pac.id} (${view.items.length} zones)`, {
            fontFamily: 'Inter',
            fontSize: '18px',
            color: '#e8edf5',
        }).setOrigin(0.5, 0.5);
        this.root.add(title);
        fadeIn(this, title);
    }

    private renderError(view: ErrorView) {
        const { width, height } = this.scale.gameSize;
        const bg = this.add.rectangle(width / 2, height / 2, Math.min(700, width - 80), 200, 0x2a0a0a, 0.9);
        bg.setStrokeStyle(2, 0x802020, 1);
        const title = this.add.text(width / 2, height / 2 - 50, 'Error', {
            fontFamily: 'Inter', fontSize: '24px', color: '#ff8080', fontStyle: 'bold',
        }).setOrigin(0.5, 0.5);
        const text = this.add.text(width / 2, height / 2, view.errorText, {
            fontFamily: 'Inter', fontSize: '14px', color: '#fadada',
            wordWrap: { width: Math.min(660, width - 100) }, align: 'center',
        }).setOrigin(0.5, 0.5);
        this.root.add([bg, title, text]);
        fadeIn(this, [bg, title, text]);
    }

    private renderLinks(
        links: RenderLink[],
        x: number,
        y: number,
        maxWidth: number,
    ): Phaser.GameObjects.GameObject[] {
        const created: Phaser.GameObjects.GameObject[] = [];
        let cursorY = y;
        const gap = 10;

        for (let i = 0; i < links.length; i++) {
            const l = links[i];
            const btn = createButton(this, x, cursorY, l.text, () => {
                this.bridge.onLinkClick(l);
            }, {
                paddingX: 16,
                paddingY: 12,
                fontSize: 16,
                bg: 0x12233b,
                bgHover: 0x274068,
                minWidth: Math.min(maxWidth, 200),
                maxWidth: maxWidth,
                align: 'left',
            }, l.disabled);
            created.push(btn.container);

            btn.container.setAlpha(0);
            const dy = 14;
            btn.container.y = cursorY + dy;
            this.tweens.add({
                targets: btn.container,
                alpha: 1,
                y: cursorY,
                duration: 240,
                delay: 60 + i * 50,
                ease: 'Cubic.easeOut',
            });

            cursorY += btn.height + gap;
        }
        return created;
    }

    shutdown() {
        this.bridge.events.off(BridgeEvents.RENDER, this.onRender, this);
        this.bridge.events.off(BridgeEvents.SHOW_MAIN_MENU, this.handleHide, this);
        this.bridge.events.off(BridgeEvents.HIDE_MAIN_MENU, this.handleShow, this);
        this.bridge.events.off(BridgeEvents.OPEN_JOURNAL, this.handleHide, this);
        this.bridge.events.off(BridgeEvents.CLOSE_JOURNAL, this.handleShow, this);
        this.bridge.events.off(BridgeEvents.OPEN_DISCUSS, this.handleHide, this);
        this.bridge.events.off(BridgeEvents.CLOSE_DISCUSS, this.handleShow, this);
        this.scale.off('resize', this.resizeHandler);
    }
}
