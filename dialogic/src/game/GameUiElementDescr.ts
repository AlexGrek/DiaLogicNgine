export interface MeterLayout {
    opacity: number
}

export interface MeterProgressBar {
    max: number;
    min: number;
    colors: boolean;
    yellowLevel: number;
    redLevel: number;
}

export function initMeterProgressBar(): MeterProgressBar {
    return {
        max: 100, min: 0, colors: false, yellowLevel: 25, redLevel: 10
    }
}

export interface GameUiElementMeter {
    visibleIf?: string
    layout: MeterLayout
    value: string
    uid: string
    name: string
    progressBar: MeterProgressBar | null;
}

export function initGameUiElementMeter(name: string, uid: string): GameUiElementMeter {
    return {
        layout: {
            opacity: 1
        },
        value: "",
        uid: uid,
        name: name,
        progressBar: null
    }
}

export default interface GameUiElementDescr {
  meters: GameUiElementMeter[]
}

export function initGameUiElementDescr(): GameUiElementDescr {
    return {
        meters: [
            initGameUiElementMeter("hp", "hp")
        ]
    }
}