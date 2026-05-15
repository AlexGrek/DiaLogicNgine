import Phaser from 'phaser';

export interface PhaserButtonStyle {
    bg?: number;
    bgHover?: number;
    bgDisabled?: number;
    border?: number;
    textColor?: string;
    textColorDisabled?: string;
    fontSize?: number;
    paddingX?: number;
    paddingY?: number;
    minWidth?: number;
    maxWidth?: number;
    align?: 'left' | 'center' | 'right';
}

export interface PhaserButton {
    container: Phaser.GameObjects.Container;
    setDisabled: (disabled: boolean) => void;
    setText: (text: string) => void;
    destroy: () => void;
    width: number;
    height: number;
}

const DEFAULT_STYLE: Required<PhaserButtonStyle> = {
    bg: 0x101723,
    bgHover: 0x223046,
    bgDisabled: 0x0a0e15,
    border: 0x3b5070,
    textColor: '#dde6f2',
    textColorDisabled: '#5a6478',
    fontSize: 18,
    paddingX: 18,
    paddingY: 10,
    minWidth: 0,
    maxWidth: 0,
    align: 'left',
};

export function createButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    style: PhaserButtonStyle = {},
    disabled = false
): PhaserButton {
    const s = { ...DEFAULT_STYLE, ...style };

    const container = scene.add.container(x, y);

    const text = scene.add.text(0, 0, label, {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: `${s.fontSize}px`,
        color: disabled ? s.textColorDisabled : s.textColor,
        align: s.align,
        wordWrap: s.maxWidth > 0 ? { width: s.maxWidth - s.paddingX * 2, useAdvancedWrap: true } : undefined,
    });
    text.setOrigin(0, 0);

    const textWidth = text.width;
    const textHeight = text.height;

    let w = textWidth + s.paddingX * 2;
    if (s.minWidth > 0) w = Math.max(w, s.minWidth);
    if (s.maxWidth > 0) w = Math.min(w, s.maxWidth);
    const h = textHeight + s.paddingY * 2;

    const bgRect = scene.add.rectangle(0, 0, w, h, disabled ? s.bgDisabled : s.bg, 0.85);
    bgRect.setOrigin(0, 0);
    bgRect.setStrokeStyle(1, s.border, 0.8);

    if (s.align === 'center') {
        text.setPosition(w / 2, h / 2);
        text.setOrigin(0.5, 0.5);
    } else if (s.align === 'right') {
        text.setPosition(w - s.paddingX, h / 2);
        text.setOrigin(1, 0.5);
    } else {
        text.setPosition(s.paddingX, h / 2);
        text.setOrigin(0, 0.5);
    }

    container.add([bgRect, text]);
    container.setSize(w, h);
    container.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);

    let isDisabled = disabled;

    container.on('pointerover', () => {
        if (isDisabled) return;
        bgRect.fillColor = s.bgHover;
        scene.tweens.add({ targets: container, scale: 1.02, duration: 100 });
    });
    container.on('pointerout', () => {
        if (isDisabled) return;
        bgRect.fillColor = s.bg;
        scene.tweens.add({ targets: container, scale: 1.0, duration: 100 });
    });
    container.on('pointerdown', () => {
        if (isDisabled) return;
        scene.tweens.add({
            targets: container, scale: 0.97, duration: 50, yoyo: true,
            onComplete: () => onClick(),
        });
    });

    const button: PhaserButton = {
        container,
        width: w,
        height: h,
        setDisabled: (d: boolean) => {
            isDisabled = d;
            bgRect.fillColor = d ? s.bgDisabled : s.bg;
            text.setColor(d ? s.textColorDisabled : s.textColor);
        },
        setText: (t: string) => text.setText(t),
        destroy: () => container.destroy(),
    };

    return button;
}

export function fadeIn(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[], duration = 250, delay = 0) {
    const targets = Array.isArray(target) ? target : [target];
    targets.forEach(t => {
        const obj = t as unknown as { setAlpha?: (a: number) => void };
        obj.setAlpha?.(0);
    });
    scene.tweens.add({ targets, alpha: 1, duration, delay, ease: 'Sine.easeOut' });
}

export function fadeOut(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[], duration = 200, onComplete?: () => void) {
    const targets = Array.isArray(target) ? target : [target];
    scene.tweens.add({ targets, alpha: 0, duration, ease: 'Sine.easeIn', onComplete });
}

type Movable = Phaser.GameObjects.GameObject & { x: number; y: number; alpha: number };

export function slideInFromRight(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject, distance: number, duration = 250, delay = 0) {
    const t = target as Movable;
    const originalX = t.x;
    t.x = originalX + distance;
    t.alpha = 0;
    scene.tweens.add({
        targets: target,
        x: originalX,
        alpha: 1,
        duration,
        delay,
        ease: 'Cubic.easeOut',
    });
}

export function slideInFromBottom(scene: Phaser.Scene, target: Phaser.GameObjects.GameObject, distance: number, duration = 250, delay = 0) {
    const t = target as Movable;
    const originalY = t.y;
    t.y = originalY + distance;
    t.alpha = 0;
    scene.tweens.add({
        targets: target,
        y: originalY,
        alpha: 1,
        duration,
        delay,
        ease: 'Cubic.easeOut',
    });
}

export function loadImageAsync(scene: Phaser.Scene, key: string, url: string): Promise<boolean> {
    return new Promise((resolve) => {
        if (scene.textures.exists(key)) {
            resolve(true);
            return;
        }
        let settled = false;
        const onComplete = () => {
            if (settled) return;
            settled = true;
            scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
            resolve(scene.textures.exists(key));
        };
        const onError = () => {
            if (settled) return;
            settled = true;
            scene.load.off(Phaser.Loader.Events.COMPLETE, onComplete);
            resolve(false);
        };
        scene.load.once(Phaser.Loader.Events.COMPLETE, onComplete);
        scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
        scene.load.image(key, url);
        scene.load.start();
    });
}

export function imageKeyFor(url: string): string {
    return `img:${url}`;
}
