import Dialog, { DialogWindow } from "../game/Dialog";
import { GameDescription } from "../game/GameDescription";
import { State } from "./GameState";

export class GameExecManager {
    
    game: GameDescription

    constructor(game: GameDescription) {
        this.game = game
    }

    getCurrentDialogWindow(state: State): Readonly<[Dialog, DialogWindow]> | null {
        switch (state.position.kind) {
            case "window":
                const dialog = this.game.dialogs.find(d => d.name === state.position.dialog)
                if (dialog === undefined)
                    return null
                const window = dialog?.windows.find(w => w.uid === state.position.window)
                if (window === undefined)
                    return null
                return [dialog, window]
        }
    }
}