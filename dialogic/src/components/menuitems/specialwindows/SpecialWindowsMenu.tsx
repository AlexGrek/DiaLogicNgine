import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { AppOutletContext } from '../../../App';
import PillLikeTabs, { PillTab } from '../../common/PillLikeTabs';
import PointAncClick from '../pointandclick/PointAncClick';
import { PointAndClick } from '../../../game/PointAndClick';
import SpecialWindowPlaceholder from './SpecialWindowPlaceholder';

/**
 * "Special windows" editor — groups the special dialog-window widget types into
 * tabs. Point & Click is the first implemented type; the remaining tabs are
 * placeholders for upcoming widget types.
 */
const SpecialWindowsMenu: React.FC = () => {
    const { game, setGame } = useOutletContext<AppOutletContext>();

    const pacTab = (
        <PointAncClick
            game={game}
            items={game.pacWidgets}
            onSetItems={(items: PointAndClick[]) =>
                setGame(prev => ({ ...prev, pacWidgets: items }))
            }
        />
    );

    const tabs: PillTab[] = [
        { header: 'Point & Click', content: pacTab },
        {
            header: 'Trading',
            content: <SpecialWindowPlaceholder
                title="Trading"
                description="Buy/sell window where the player exchanges items and currency with a merchant character."
            />,
        },
        {
            header: 'Navigation',
            content: <SpecialWindowPlaceholder
                title="Navigation"
                description="Map-style window for moving between locations on a navigable overview."
            />,
        },
        {
            header: 'Canvas',
            content: <SpecialWindowPlaceholder
                title="Canvas"
                description="Free-form canvas window for custom interactive layouts and mini-games."
            />,
        },
        {
            header: 'Chapter opening',
            content: <SpecialWindowPlaceholder
                title="Chapter opening"
                description="Cinematic title/intro window shown when a new chapter of the story begins."
            />,
        },
    ];

    return (
        <div className="saveload-page" data-testid="special-windows-menu">
            <h2 className="center-header">Special windows</h2>
            <PillLikeTabs tabs={tabs} />
        </div>
    );
};

export default SpecialWindowsMenu;
