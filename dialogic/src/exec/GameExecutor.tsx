import { GameDescription } from "../game/GameDescription";
import { State } from "./GameState";

export class GameExecManager {
    state: State
    stateHistory: State[]
    game: GameDescription

    constructor(game: GameDescription) {
        this.game = game
        this.state = this.createInitialState(game)
        this.stateHistory = []
    }

    createInitialState(game: GameDescription): State {
        // TODO: later
        return {
            position: {
                dialog: "a",
                window: "a"
            },
            positionStack: [],
            props: {}
        }
    }
}