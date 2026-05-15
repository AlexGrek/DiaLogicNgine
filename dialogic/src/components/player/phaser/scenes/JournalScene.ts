import Phaser from 'phaser';
import { BridgeEvents, PlayerBridge, resolveImage } from '../types';
import { createButton, fadeIn, fadeOut, imageKeyFor, loadImageAsync } from '../uiHelpers';
import { createEmptyFact, getFact } from '../../../../game/Fact';
import { ProgressRenderView, QuestRenderView } from '../../../../exec/RenderView';

export const JOURNAL_SCENE = 'JournalScene';

type Tab = 'objectives' | 'facts' | 'people';

export class JournalScene extends Phaser.Scene {
    private bridge!: PlayerBridge;
    private root!: Phaser.GameObjects.Container;
    private active = false;
    private currentTab: Tab = 'objectives';
    private selectedItem: string | null = null;

    constructor() {
        super(JOURNAL_SCENE);
    }

    init(data: { bridge: PlayerBridge }) {
        this.bridge = data.bridge;
    }

    create() {
        this.root = this.add.container(0, 0);
        this.root.setDepth(50);
        this.root.setVisible(false);

        this.bridge.events.on(BridgeEvents.OPEN_JOURNAL, this.handleOpen, this);
        this.bridge.events.on(BridgeEvents.CLOSE_JOURNAL, this.handleClose, this);
        this.scale.on('resize', this.relayout, this);
    }

    private handleOpen = (initialTab: Tab = 'objectives') => {
        this.currentTab = initialTab;
        this.selectedItem = null;
        this.active = true;
        this.root.setVisible(true);
        this.build();
    };

    private handleClose = () => {
        if (!this.active) return;
        this.active = false;
        fadeOut(this, this.root.list as Phaser.GameObjects.GameObject[], 200, () => {
            this.root.removeAll(true);
            this.root.setVisible(false);
        });
    };

    private relayout = () => {
        if (this.active) this.build();
    };

    private build() {
        this.root.removeAll(true);
        const { width, height } = this.scale.gameSize;

        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.65);
        overlay.setOrigin(0, 0);
        this.root.add(overlay);

        const panelW = Math.min(960, width - 60);
        const panelH = Math.min(620, height - 80);
        const panelX = (width - panelW) / 2;
        const panelY = (height - panelH) / 2;

        const panel = this.add.rectangle(panelX, panelY, panelW, panelH, 0x0b1220, 0.95);
        panel.setOrigin(0, 0);
        panel.setStrokeStyle(1, 0x2f4368, 0.9);
        this.root.add(panel);

        const title = this.add.text(panelX + 24, panelY + 18, 'Journal', {
            fontFamily: 'Inter', fontSize: '22px', color: '#f0c674', fontStyle: 'bold',
        });
        this.root.add(title);

        const closeBtn = createButton(this, panelX + panelW - 60 - 16, panelY + 12, '✕', () => {
            this.bridge.events.emit(BridgeEvents.CLOSE_JOURNAL);
        }, {
            paddingX: 16, paddingY: 6, fontSize: 16, bg: 0x2a1414, bgHover: 0x4a2020,
            border: 0x5b2020, textColor: '#e0a4a4', minWidth: 60, align: 'center',
        });
        this.root.add(closeBtn.container);

        const tabsY = panelY + 60;
        const tabs: { id: Tab; label: string }[] = [
            { id: 'objectives', label: 'Objectives' },
            { id: 'facts', label: 'Facts' },
            { id: 'people', label: 'People' },
        ];
        let tx = panelX + 24;
        tabs.forEach(t => {
            const isActive = t.id === this.currentTab;
            const btn = createButton(this, tx, tabsY, t.label, () => {
                this.currentTab = t.id;
                this.selectedItem = null;
                this.build();
            }, {
                paddingX: 18, paddingY: 8, fontSize: 14,
                bg: isActive ? 0x2e4670 : 0x14223a,
                border: isActive ? 0x4c6da0 : 0x2f4368,
                textColor: isActive ? '#ffffff' : '#b8c2d6',
                align: 'center',
            });
            this.root.add(btn.container);
            tx += btn.width + 8;
        });

        const contentY = tabsY + 50;
        const contentH = panelY + panelH - contentY - 20;
        const leftW = 320;
        const rightX = panelX + 24 + leftW + 16;
        const rightW = panelW - leftW - 24 * 2 - 16;

        const leftPane = this.add.rectangle(panelX + 24, contentY, leftW, contentH, 0x05080f, 0.6);
        leftPane.setOrigin(0, 0);
        leftPane.setStrokeStyle(1, 0x1a2433, 0.8);
        this.root.add(leftPane);

        const rightPane = this.add.rectangle(rightX, contentY, rightW, contentH, 0x05080f, 0.6);
        rightPane.setOrigin(0, 0);
        rightPane.setStrokeStyle(1, 0x1a2433, 0.8);
        this.root.add(rightPane);

        switch (this.currentTab) {
            case 'objectives':
                this.renderObjectives(panelX + 24, contentY, leftW, contentH, rightX, rightW);
                break;
            case 'facts':
                this.renderFacts(panelX + 24, contentY, leftW, contentH, rightX, rightW);
                break;
            case 'people':
                this.renderPeople(panelX + 24, contentY, leftW, contentH, rightX, rightW);
                break;
        }

        fadeIn(this, [overlay, panel], 200);
        const newcomers = this.root.list.filter(c => c !== overlay && c !== panel);
        newcomers.forEach(c => {
            const obj = c as unknown as { setAlpha?: (a: number) => void };
            obj.setAlpha?.(0);
        });
        this.tweens.add({ targets: newcomers, alpha: 1, duration: 220, delay: 80 });
    }

    private renderObjectives(leftX: number, leftY: number, leftW: number, contentH: number, rightX: number, rightW: number) {
        const state = this.bridge.getState();
        const exec = this.bridge.getExec();
        const progress: ProgressRenderView = exec.renderer.renderProgress(state);

        const sections: { label: string; items: QuestRenderView[]; color: string }[] = [
            { label: 'Open', items: progress.questsOpen, color: '#8fd1ff' },
            { label: 'Completed', items: progress.questsCompleted, color: '#9ff09f' },
            { label: 'Failed', items: progress.questsFailed, color: '#ff9090' },
        ];

        let listY = leftY + 10;
        const listX = leftX + 12;
        const allItems: { quest: QuestRenderView; status: string }[] = [];

        sections.forEach(section => {
            if (section.items.length === 0) return;
            const header = this.add.text(listX, listY, section.label, {
                fontFamily: 'Inter', fontSize: '13px', color: section.color, fontStyle: 'bold',
            });
            this.root.add(header);
            listY += 22;

            section.items.forEach(q => {
                const key = `${q.questLineName}::${q.name}`;
                const isSelected = this.selectedItem === key;
                const btn = createButton(this, listX, listY, `${q.name}`, () => {
                    this.selectedItem = key;
                    this.build();
                }, {
                    paddingX: 12, paddingY: 8, fontSize: 13,
                    bg: isSelected ? 0x2e4670 : 0x101723,
                    textColor: isSelected ? '#ffffff' : '#dde6f2',
                    minWidth: leftW - 24, maxWidth: leftW - 24,
                });
                this.root.add(btn.container);
                allItems.push({ quest: q, status: section.label });
                listY += btn.height + 4;
            });
            listY += 8;
        });

        if (allItems.length === 0) {
            const empty = this.add.text(listX, leftY + 20, '(no quests yet)', {
                fontFamily: 'Inter', fontSize: '13px', color: '#5a6478', fontStyle: 'italic',
            });
            this.root.add(empty);
            return;
        }

        const selected = this.selectedItem
            ? allItems.find(i => `${i.quest.questLineName}::${i.quest.name}` === this.selectedItem)
            : allItems[0];

        if (!selected) return;

        let dy = leftY + 12;
        const titleText = this.add.text(rightX + 12, dy, selected.quest.name, {
            fontFamily: 'Inter', fontSize: '20px', color: '#f0c674', fontStyle: 'bold',
            wordWrap: { width: rightW - 24 },
        });
        this.root.add(titleText);
        dy += titleText.height + 6;

        const qlText = this.add.text(rightX + 12, dy, `${selected.quest.questLineName} • ${selected.status}`, {
            fontFamily: 'Inter', fontSize: '12px', color: '#8fa1c1',
        });
        this.root.add(qlText);
        dy += qlText.height + 14;

        const tasksTitle = this.add.text(rightX + 12, dy, 'Tasks', {
            fontFamily: 'Inter', fontSize: '14px', color: '#b8c2d6', fontStyle: 'bold',
        });
        this.root.add(tasksTitle);
        dy += tasksTitle.height + 6;

        if (selected.quest.tasks.length === 0) {
            const noTasks = this.add.text(rightX + 12, dy, '(no tasks)', {
                fontFamily: 'Inter', fontSize: '12px', color: '#5a6478', fontStyle: 'italic',
            });
            this.root.add(noTasks);
        } else {
            selected.quest.tasks.forEach(task => {
                const icon = task.status === 'completed' ? '✔' : task.status === 'failed' ? '✖' : '◦';
                const color = task.status === 'completed' ? '#9ff09f'
                    : task.status === 'failed' ? '#ff9090'
                    : '#dde6f2';
                const t = this.add.text(rightX + 12, dy, `${icon}  ${task.name}`, {
                    fontFamily: 'Inter', fontSize: '13px', color,
                    wordWrap: { width: rightW - 24 },
                });
                this.root.add(t);
                dy += t.height + 6;
                if (dy > leftY + contentH - 20) return;
            });
        }
    }

    private renderFacts(leftX: number, leftY: number, leftW: number, _contentH: number, rightX: number, rightW: number) {
        const state = this.bridge.getState();
        const game = this.bridge.getExec().game;

        if (state.knownFacts.length === 0) {
            const empty = this.add.text(leftX + 12, leftY + 20, '(no facts learned yet)', {
                fontFamily: 'Inter', fontSize: '13px', color: '#5a6478', fontStyle: 'italic',
            });
            this.root.add(empty);
            return;
        }

        let listY = leftY + 10;
        state.knownFacts.forEach(factId => {
            let f = getFact(game, factId);
            if (!f) {
                f = createEmptyFact('error');
                f.short = `Error: ${factId}`;
            }
            const isSelected = this.selectedItem === factId;
            const btn = createButton(this, leftX + 12, listY, f.short || factId, () => {
                this.selectedItem = factId;
                this.build();
            }, {
                paddingX: 12, paddingY: 8, fontSize: 13,
                bg: isSelected ? 0x2e4670 : 0x101723,
                textColor: isSelected ? '#ffffff' : '#dde6f2',
                minWidth: leftW - 24, maxWidth: leftW - 24,
            });
            this.root.add(btn.container);
            listY += btn.height + 4;
        });

        const selectedId = this.selectedItem || state.knownFacts[0];
        let selected = getFact(game, selectedId);
        if (!selected) {
            selected = createEmptyFact('error');
            selected.full = `No fact: ${selectedId}`;
        }

        let dy = leftY + 12;
        const titleText = this.add.text(rightX + 12, dy, selected.short || selectedId, {
            fontFamily: 'Inter', fontSize: '20px', color: '#f0c674', fontStyle: 'bold',
            wordWrap: { width: rightW - 24 },
        });
        this.root.add(titleText);
        dy += titleText.height + 12;

        const body = this.add.text(rightX + 12, dy, selected.full || '', {
            fontFamily: 'Inter, Georgia, serif', fontSize: '14px', color: '#dde6f2',
            wordWrap: { width: rightW - 24, useAdvancedWrap: true }, lineSpacing: 3,
        });
        this.root.add(body);
    }

    private async renderPeople(leftX: number, leftY: number, leftW: number, _contentH: number, rightX: number, rightW: number) {
        const state = this.bridge.getState();
        const exec = this.bridge.getExec();

        if (state.knownPeople.length === 0) {
            const empty = this.add.text(leftX + 12, leftY + 20, '(no people known yet)', {
                fontFamily: 'Inter', fontSize: '13px', color: '#5a6478', fontStyle: 'italic',
            });
            this.root.add(empty);
            return;
        }

        let listY = leftY + 10;
        state.knownPeople.forEach(charId => {
            const descr = exec.renderer.getCharInfoDescription(state, charId);
            const isSelected = this.selectedItem === charId;
            const btn = createButton(this, leftX + 12, listY, descr.name, () => {
                this.selectedItem = charId;
                this.build();
            }, {
                paddingX: 12, paddingY: 8, fontSize: 13,
                bg: isSelected ? 0x2e4670 : 0x101723,
                textColor: isSelected ? '#ffffff' : '#dde6f2',
                minWidth: leftW - 24, maxWidth: leftW - 24,
            });
            this.root.add(btn.container);
            listY += btn.height + 4;
        });

        const selectedId = this.selectedItem || state.knownPeople[0];
        const descr = exec.renderer.getCharInfoDescription(state, selectedId);

        const dy = leftY + 12;
        const avatarUrl = resolveImage(descr.avatar);
        let nameOffsetX = 0;
        if (avatarUrl) {
            const key = imageKeyFor(avatarUrl);
            const ok = await loadImageAsync(this, key, avatarUrl);
            if (ok && this.active && this.currentTab === 'people') {
                const img = this.add.image(rightX + 12, dy, key);
                img.setOrigin(0, 0);
                const target = 80;
                const scale = Math.min(target / img.width, target / img.height);
                img.setScale(scale);
                this.root.add(img);
                nameOffsetX = target + 14;
            }
        }
        const nameText = this.add.text(rightX + 12 + nameOffsetX, dy + 20, descr.name, {
            fontFamily: 'Inter', fontSize: '22px', color: '#f0c674', fontStyle: 'bold',
            wordWrap: { width: rightW - 24 - nameOffsetX },
        });
        this.root.add(nameText);
        const baseDy = dy + Math.max(90, nameText.height + 30);

        const body = this.add.text(rightX + 12, baseDy, descr.description || '', {
            fontFamily: 'Inter, Georgia, serif', fontSize: '14px', color: '#dde6f2',
            wordWrap: { width: rightW - 24, useAdvancedWrap: true }, lineSpacing: 3,
        });
        this.root.add(body);
    }

    shutdown() {
        this.bridge.events.off(BridgeEvents.OPEN_JOURNAL, this.handleOpen, this);
        this.bridge.events.off(BridgeEvents.CLOSE_JOURNAL, this.handleClose, this);
        this.scale.off('resize', this.relayout, this);
    }
}
