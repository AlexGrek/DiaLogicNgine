import React, { useState, useEffect } from 'react';
import { State } from '../../exec/GameState';
import { RenderView } from '../../exec/RenderView';
import './gamemenupanel.css'


interface GameMenuPanelProps {
    state: State;
    view: RenderView
    open: boolean
    onOpenClose: (open: boolean) => void
}

const GameMenuPanel: React.FC<GameMenuPanelProps> = ({ state, view, open, onOpenClose }) => {
    // const [menuOpen, setMenuOpen] = useState<boolean>(false);
    // useEffect(() => {
    //     setMenuOpen(false);
    // }, [state]);

    const getClass = (base: string) => {
        const addClass = open ? "opening" : "closing"
        return `${base} ${addClass}`
    }

    return (
        <div className={getClass('game-menu-container')}>
            <div className='game-menu-top'>
                <div className={getClass('game-menu-widget-container')}>
                    <div className={getClass('game-menu-widget')}>THis is a game fucking widdget</div>
                </div>
            </div>
            <div className='game-menu-bottom'>
            <div className={getClass('game-menu-screen')}>
                <p>This is some menu contents</p>
                <div className={getClass('game-menu-button-group')}>
                    <button className='game-menu-sub-button'>Inventory</button>
                    <button className='game-menu-sub-button'>Facts</button>
                    <button className='game-menu-sub-button'>Journal</button>
                    <button className='game-menu-sub-button'>Menu</button>
                </div>
            </div>
            <button onClick={() => onOpenClose(!open)}>Open menu</button>
            </div>
        </div>
    );
};

export default GameMenuPanel;
