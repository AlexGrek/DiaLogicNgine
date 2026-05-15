import Phaser from 'phaser';
import { BridgeEvents, PlayerBridge } from '../types';
import { createButton, fadeIn, fadeOut } from '../uiHelpers';
import { CharDialogRenderView } from '../../../../exec/RenderView';
import { createEmptyFact, getFact } from '../../../../game/Fact';
import { getLoc } from '../../../../game/Loc';
import { getItemByIdOrNull } from '../../../../game/Items';
import { DiscussionTopicType } from '../../../../exec/GameExecutor';

export const DISCUSS_SCENE = 'DiscussScene';

type Category = { id: DiscussionTopicType; label: string; items: { name: string; value: string }[] };

export class DiscussScene extends Phaser.Scene {
    private bridge!: PlayerBridge;
    private root!: Phaser.GameObjects.Container;
    private active = false;
    private view: CharDialogRenderView | null = null;
    private selectedCategory: DiscussionTopicType = 'fact';

    constructor() {
        super(DISCUSS_SCENE);
    }

    init(data: { bridge: PlayerBridge }) {
        this.bridge = data.bridge;
    }

    create() {
        this.root = this.add.container(0, 0);
        this.root.setDepth(60);
        this.root.setVisible(false);

        this.bridge.events.on(BridgeEvents.OPEN_DISCUSS, this.handleOpen, this);
        this.bridge.events.on(BridgeEvents.CLOSE_DISCUSS, this.handleClose, this);
        this.scale.on('resize', this.relayout, this);
    }

    private handleOpen = (view: CharDialogRenderView) => {
        this.view = view;
        this.active = true;
        const cats = this.buildCategories(view);
        this.selectedCategory = (cats.find(c => c.items.length > 0)?.id) || cats[0]?.id || 'fact';
        this.root.setVisible(true);
        this.build();
    };

    private handleClose = () => {
        if (!this.active) return;
        this.active = false;
        fadeOut(this, this.root.list as Phaser.GameObjects.GameObject[], 180, () => {
            this.root.removeAll(true);
            this.root.setVisible(false);
        });
    };

    private relayout = () => {
        if (this.active) this.build();
    };

    private buildCategories(view: CharDialogRenderView): Category[] {
        const state = this.bridge.getState();
        const game = this.bridge.getExec().game;
        const cats: Category[] = [];
        type Entry = { name: string; value: string; discussable: boolean };
        if (view.dialogOptions.canDiscussFacts) {
            const items: Entry[] = state.knownFacts.map(id => {
                const f = getFact(game, id) || createEmptyFact('error');
                return { name: f.short || id, value: id, discussable: !!f.discussable };
            });
            cats.push({
                id: 'fact', label: 'Facts',
                items: items.filter(f => f.discussable).map(f => ({ name: f.name, value: f.value })),
            });
        }
        if (view.dialogOptions.canDiscussChars) {
            const items: Entry[] = state.knownPeople.map(id => {
                const d = this.bridge.getExec().renderer.getCharInfoDescription(state, id);
                return { name: d.name, value: id, discussable: !!d.charObject.discussable };
            });
            cats.push({
                id: 'char', label: 'People',
                items: items.filter(c => c.discussable).map(c => ({ name: c.name, value: c.value })),
            });
        }
        if (view.dialogOptions.canDiscussLocations) {
            const items: Entry[] = state.knownPlaces.map(id => {
                const l = getLoc(game, id);
                return { name: l?.displayName || id, value: id, discussable: !!l?.discussable };
            });
            cats.push({
                id: 'loc', label: 'Places',
                items: items.filter(l => l.discussable).map(l => ({ name: l.name, value: l.value })),
            });
        }
        if (view.dialogOptions.canDiscussItems) {
            cats.push({
                id: 'item', label: 'Items',
                items: state.carriedItems.map(ci => {
                    const item = getItemByIdOrNull(game.items, ci.item);
                    const name = item?.name || ci.item;
                    const qty = ci.quantity > 1 ? ` ×${ci.quantity}` : '';
                    return { name: `${name}${qty}`, value: ci.item };
                }),
            });
        }
        return cats;
    }

    private build() {
        if (!this.view) return;
        this.root.removeAll(true);
        const { width, height } = this.scale.gameSize;

        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.6);
        overlay.setOrigin(0, 0);
        this.root.add(overlay);

        const panelW = Math.min(820, width - 60);
        const panelH = Math.min(560, height - 80);
        const panelX = (width - panelW) / 2;
        const panelY = (height - panelH) / 2;

        const panel = this.add.rectangle(panelX, panelY, panelW, panelH, 0x0b1220, 0.95);
        panel.setOrigin(0, 0);
        panel.setStrokeStyle(1, 0x2f4368, 0.9);
        this.root.add(panel);

        const title = this.add.text(panelX + 24, panelY + 18, 'Talk about...', {
            fontFamily: 'Inter', fontSize: '22px', color: '#f0c674', fontStyle: 'bold',
        });
        this.root.add(title);

        const cancelBtn = createButton(this, panelX + panelW - 110 - 16, panelY + 12, 'Cancel', () => {
            this.bridge.events.emit(BridgeEvents.CLOSE_DISCUSS);
        }, {
            paddingX: 16, paddingY: 6, fontSize: 14, bg: 0x2a1414, bgHover: 0x4a2020,
            border: 0x5b2020, textColor: '#e0a4a4', minWidth: 110, align: 'center',
        });
        this.root.add(cancelBtn.container);

        const cats = this.buildCategories(this.view);
        const tabsY = panelY + 60;
        let tx = panelX + 24;
        cats.forEach(c => {
            const isActive = c.id === this.selectedCategory;
            const btn = createButton(this, tx, tabsY, `${c.label} (${c.items.length})`, () => {
                this.selectedCategory = c.id;
                this.build();
            }, {
                paddingX: 16, paddingY: 8, fontSize: 14,
                bg: isActive ? 0x2e4670 : 0x14223a,
                border: isActive ? 0x4c6da0 : 0x2f4368,
                textColor: isActive ? '#ffffff' : '#b8c2d6',
                align: 'center',
            });
            this.root.add(btn.container);
            tx += btn.width + 8;
        });

        const listY = tabsY + 50;
        const listH = panelY + panelH - listY - 20;
        const listBg = this.add.rectangle(panelX + 24, listY, panelW - 48, listH, 0x05080f, 0.6);
        listBg.setOrigin(0, 0);
        listBg.setStrokeStyle(1, 0x1a2433, 0.8);
        this.root.add(listBg);

        const current = cats.find(c => c.id === this.selectedCategory);
        if (!current || current.items.length === 0) {
            const empty = this.add.text(panelX + 24 + 12, listY + 16, '(nothing to discuss here)', {
                fontFamily: 'Inter', fontSize: '13px', color: '#5a6478', fontStyle: 'italic',
            });
            this.root.add(empty);
        } else {
            let iy = listY + 12;
            const itemX = panelX + 24 + 12;
            const itemW = panelW - 48 - 24;
            current.items.forEach((it, idx) => {
                const charUid = this.view!.char.uid;
                const btn = createButton(this, itemX, iy, it.name, () => {
                    this.bridge.events.emit(BridgeEvents.CLOSE_DISCUSS);
                    this.bridge.onDiscuss(current.id, it.value, charUid);
                }, {
                    paddingX: 14, paddingY: 9, fontSize: 14,
                    bg: 0x101723, bgHover: 0x223046,
                    minWidth: itemW, maxWidth: itemW,
                });
                this.root.add(btn.container);
                btn.container.setAlpha(0);
                this.tweens.add({
                    targets: btn.container, alpha: 1,
                    x: { from: itemX - 12, to: itemX },
                    duration: 220, delay: 80 + idx * 30,
                });
                iy += btn.height + 6;
                if (iy > listY + listH - 20) return;
            });
        }

        fadeIn(this, [overlay, panel, title, cancelBtn.container], 200);
    }

    shutdown() {
        this.bridge.events.off(BridgeEvents.OPEN_DISCUSS, this.handleOpen, this);
        this.bridge.events.off(BridgeEvents.CLOSE_DISCUSS, this.handleClose, this);
        this.scale.off('resize', this.relayout, this);
    }
}
