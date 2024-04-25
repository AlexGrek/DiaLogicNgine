import { GameUiElementMeter } from "../game/GameUiElementDescr"
import { GameExecManager } from "./GameExecutor"
import { State } from "./GameState"
import { evaluateAsAnyProcessor } from "./Runtime"

export interface UiElementMeterRenderView {
    uiElementType: "meter"
    currentValue: any
    description: GameUiElementMeter
}

export type UiElementRenderView = UiElementMeterRenderView

export default class GameUiElementsProcessor {
    exec: GameExecManager

    constructor(exec: GameExecManager) {
        this.exec = exec
    }

    getVisibleUiElements(state: State): UiElementRenderView[] {
        return this.exec.game.uiElements.meters
            .filter(meter => this.isVisible(state, meter))
            .map(meter => {
                return {
                    uiElementType: "meter",
                    currentValue: this.getValue(state, meter.value),
                    description: meter
                }
            })
    }

    getValue(instate: State, processor: string | undefined) {
        if (!processor) {
            return 0;
        }
        const { decision } = evaluateAsAnyProcessor(this.exec.game, processor, this.exec, instate)
        return decision
    }

    isVisible(state: State, meter: GameUiElementMeter) {
        if (!meter.visibleIf) {
            return true
        }
        return this.exec.getBoolDecisionWithDefault(state, true, meter.visibleIf)
    }
}