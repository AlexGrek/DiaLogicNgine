import { GameExecManager } from '../../exec/GameExecutor';
import { State } from '../../exec/GameState';
import { PlayerAction, PlayerActionError, applyAction } from '../../exec/PlayerTurn';
import { RenderWidget } from '../../exec/RenderView';
import { trace } from '../../Trace';

/**
 * Apply a player move from a UI control. The shared turn logic (exec/PlayerTurn)
 * rejects moves that are not available; a control that should not have been
 * clickable is ignored instead of crashing the render.
 */
export function playAction(
    game: GameExecManager,
    state: State,
    view: RenderWidget,
    action: PlayerAction,
    onStateUpd: (s: State) => void,
): void {
    try {
        onStateUpd(applyAction(game, state, action, view));
    } catch (e) {
        if (e instanceof PlayerActionError) {
            trace(`Ignored player action ${JSON.stringify(action)}: ${e.message}`);
            return;
        }
        throw e;
    }
}
