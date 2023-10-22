import React from 'react';
import { GameDescription } from '../../../game/GameDescription';

interface BehaviorMenuProps {
    game: GameDescription;
    onSetGame: (game: GameDescription) => void
}

const BehaviorMenu: React.FC<BehaviorMenuProps> = ({ game }) => {
    return (
        <div>
            
        </div>
    );
};

export default BehaviorMenu;
