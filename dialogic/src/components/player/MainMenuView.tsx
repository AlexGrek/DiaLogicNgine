import React, { useEffect, useState } from 'react';
import { GameDescription } from '../../game/GameDescription';
import { styleWithImage } from '../UiUtils';

interface MainMenuViewProps {
    game: GameDescription;
    onStart: () => void;
    onExit?: () => void;
}

const MainMenuView: React.FC<MainMenuViewProps> = ({ game, onStart, onExit }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const id = setTimeout(() => setVisible(true), 10);
        return () => clearTimeout(id);
    }, []);

    const bgStyle = game.startMenu.menuBackground
        ? styleWithImage(game.startMenu.menuBackground)
        : {};

    return (
        <div
            data-testid="main-menu-overlay"
            className={`main-menu-overlay${visible ? ' main-menu-visible' : ''}`}
            style={bgStyle}
        >
            <div className="main-menu-backdrop" />
            <div className="main-menu-content">
                <h1 className="main-menu-title">
                    {game.general.name || 'DiaLogicNgine'}
                </h1>
                {game.general.description && (
                    <p className="main-menu-subtitle">{game.general.description}</p>
                )}
                <div className="main-menu-buttons">
                    <button
                        data-testid="main-menu-new-game"
                        className="main-menu-btn main-menu-btn-primary"
                        onClick={onStart}
                    >
                        ▶&nbsp;&nbsp;New Game
                    </button>
                    {onExit && (
                        <button
                            data-testid="main-menu-exit"
                            className="main-menu-btn main-menu-btn-exit"
                            onClick={onExit}
                        >
                            Exit
                        </button>
                    )}
                </div>
                <div className="main-menu-footer">
                    v{game.general.version || '0.0.0'}
                </div>
            </div>
        </div>
    );
};

export default MainMenuView;
