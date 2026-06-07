import React, { useEffect, useRef, useState } from 'react';
import { GameExecManager } from '../../exec/GameExecutor';
import { InGameNotificationType, State } from '../../exec/GameState';
import { LocalizationManager } from '../../exec/Localization';
import { getItemByIdOrUnknown } from '../../game/Items';
import { generateImageUrl } from '../../Utils';
import './gamenotifications.css';

interface GameNotificationsViewProps {
    state: State;
    game: GameExecManager;
    onNotificationClick?: (type: InGameNotificationType) => void;
}

interface Toast {
    id: number;
    type: InGameNotificationType;
    text: string;
    item?: string;
}

const TOAST_LIFETIME_MS = 3500;
// If this many notifications appear at once, assume a save load / bulk sync
// (rather than normal play) and re-sync silently instead of flooding the screen.
const MAX_BURST = 5;

// Category label keys (localizable) keyed by notification type.
const LABEL_KEYS: Record<InGameNotificationType, string> = {
    itemadded: 'Item received',
    itemremoved: 'Item lost',
    questnew: 'New objective',
    questprogress: 'Objective updated',
    questcompleted: 'Objective completed',
    questfailed: 'Objective failed',
    questlineopen: 'New quest',
    questlineclose: 'Quest closed',
};

const GameNotificationsView: React.FC<GameNotificationsViewProps> = ({ state, game, onNotificationClick }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const seenRef = useRef<number>(state.notifications.length);
    const idRef = useRef<number>(0);
    const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
    const localmanager = useRef<LocalizationManager>(new LocalizationManager(game.game));

    useEffect(() => {
        localmanager.current = new LocalizationManager(game.game);
    }, [game]);

    useEffect(() => {
        const notifs = state.notifications;
        // restart / load reset the queue — re-sync without replaying
        if (notifs.length < seenRef.current) {
            seenRef.current = notifs.length;
            return;
        }
        if (notifs.length === seenRef.current) {
            return;
        }
        const fresh = notifs.slice(seenRef.current);
        seenRef.current = notifs.length;
        if (fresh.length > MAX_BURST) {
            // likely a save load — sync without replaying stale notifications
            return;
        }
        const newToasts: Toast[] = fresh.map(n => ({
            id: idRef.current++,
            type: n.type,
            text: n.text,
            item: n.item,
        }));
        setToasts(prev => [...prev, ...newToasts]);
        newToasts.forEach(t => {
            const timer = setTimeout(() => {
                setToasts(prev => prev.filter(x => x.id !== t.id));
                timersRef.current.delete(timer);
            }, TOAST_LIFETIME_MS);
            timersRef.current.add(timer);
        });
    }, [state]);

    useEffect(() => {
        const timers = timersRef.current;
        return () => {
            timers.forEach(t => clearTimeout(t));
            timers.clear();
        };
    }, []);

    const dismiss = (id: number) => {
        setToasts(prev => prev.filter(x => x.id !== id));
    };

    const handleToastClick = (t: Toast) => {
        dismiss(t.id);
        onNotificationClick?.(t.type);
    };

    const renderToast = (t: Toast) => {
        const isItem = t.type === 'itemadded' || t.type === 'itemremoved';
        const item = t.item ? getItemByIdOrUnknown(game.game.items, t.item) : null;
        const img = item ? generateImageUrl(item.thumbnail || item.image || '') : '';
        const label = localmanager.current.local(LABEL_KEYS[t.type] ?? t.type);
        return (
            <div
                key={t.id}
                className={`game-toast game-toast-${t.type}`}
                data-testid={`game-toast-${t.type}`}
                role="button"
                tabIndex={0}
                onClick={() => handleToastClick(t)}
            >
                <div className='game-toast-media'>
                    {isItem && img
                        ? <img className='game-toast-thumb' src={img} alt={t.text} />
                        : <span className='game-toast-accent' />}
                </div>
                <div className='game-toast-body'>
                    <span className='game-toast-label'>{label}</span>
                    <span className='game-toast-text'>{t.text}</span>
                </div>
            </div>
        );
    };

    if (toasts.length === 0) {
        return null;
    }

    return (
        <div className='game-notifications-container' data-testid='game-notifications'>
            {toasts.map(renderToast)}
        </div>
    );
};

export default GameNotificationsView;
