import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from 'rsuite';
import { Star } from 'lucide-react';
import {
    FONT_CATEGORIES,
    FONT_OPTIONS,
    type FontCategory,
    type FontId,
} from '../../lib/fonts';
import './Pickers.css';

const FAVORITES_KEY = 'dialogic:font-favorites';
const MAX_FAVORITES = 12;

function loadFavorites(): FontId[] {
    try {
        return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]');
    } catch {
        return [];
    }
}

function saveFavorites(ids: FontId[]): void {
    try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
    } catch {
        // ignore quota errors
    }
}

interface FontTileProps {
    label: string;
    css: string;
    selected: boolean;
    onClick: () => void;
}

const FontTile: React.FC<FontTileProps> = ({ label, css, selected, onClick }) => (
    <button
        type="button"
        className={`picker-tile picker-tile-font${selected ? ' selected' : ''}`}
        onClick={onClick}
        title={label}
        data-testid={`font-tile-${label}`}
    >
        <span className="picker-tile-preview" style={{ fontFamily: css }}>Aa</span>
        <span className="picker-tile-label">{label}</span>
    </button>
);

export interface FontPickerModalProps {
    open: boolean;
    currentFontId: FontId;
    onSelect: (fontId: FontId) => void;
    onClose: () => void;
}

const FontPickerModal: React.FC<FontPickerModalProps> = ({
    open,
    currentFontId,
    onSelect,
    onClose,
}) => {
    const [favorites, setFavorites] = useState<FontId[]>(loadFavorites);
    const [activeTab, setActiveTab] = useState<'favorites' | FontCategory>('favorites');

    useEffect(() => {
        if (open) setFavorites(loadFavorites());
    }, [open]);

    const visibleFonts = useMemo(() => {
        if (activeTab === 'favorites') {
            return favorites.flatMap((id) => {
                const f = FONT_OPTIONS.find((o) => o.id === id);
                return f ? [f] : [];
            });
        }
        return FONT_OPTIONS.filter((f) => f.category === activeTab);
    }, [activeTab, favorites]);

    const handleSelect = useCallback(
        (fontId: FontId) => {
            setFavorites((prev) => {
                const next = [fontId, ...prev.filter((id) => id !== fontId)].slice(0, MAX_FAVORITES) as FontId[];
                saveFavorites(next);
                return next;
            });
            onSelect(fontId);
            onClose();
        },
        [onSelect, onClose],
    );

    return (
        <Modal open={open} onClose={onClose} size="md" className="picker-modal" data-testid="font-picker-modal">
            <Modal.Header>
                <Modal.Title>Pick a Font</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="picker-modal-body">
                    <div className="picker-tabs">
                        <button
                            type="button"
                            className={`picker-tab${activeTab === 'favorites' ? ' active' : ''}`}
                            onClick={() => setActiveTab('favorites')}
                        >
                            <Star size={14} fill={activeTab === 'favorites' ? 'currentColor' : 'none'} />
                            Favorites
                            {favorites.length > 0 && (
                                <span className="picker-tab-count">{favorites.length}</span>
                            )}
                        </button>
                        {FONT_CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                className={`picker-tab${activeTab === cat.id ? ' active' : ''}`}
                                onClick={() => setActiveTab(cat.id)}
                            >
                                {cat.label}
                                <span className="picker-tab-count">
                                    {FONT_OPTIONS.filter((f) => f.category === cat.id).length}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="picker-grid-scroll">
                        {visibleFonts.length === 0 ? (
                            <div className="picker-empty">
                                <Star size={32} opacity={0.4} />
                                <span>No favorites yet</span>
                                <span className="picker-empty-sub">Fonts you pick will appear here</span>
                            </div>
                        ) : (
                            <div className="picker-grid picker-grid-fonts">
                                {visibleFonts.map((f) => (
                                    <FontTile
                                        key={f.id}
                                        label={f.label}
                                        css={f.css}
                                        selected={f.id === currentFontId}
                                        onClick={() => handleSelect(f.id as FontId)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default FontPickerModal;
