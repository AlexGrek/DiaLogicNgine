import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Input, Modal } from 'rsuite';
import { ChevronLeft, ChevronRight, Search, Star } from 'lucide-react';
import { ALL_PACKS, findIconDef } from '../../lib/icons';
import type { IconDef, IconPack } from '../../lib/icons';
import { renderIconPaths } from '../../lib/icons/render';
import './Pickers.css';

const ICONS_PER_PAGE = 40;
const FAVORITES_KEY = 'dialogic:icon-favorites';
const MAX_FAVORITES = 24;

function loadFavorites(): string[] {
    try {
        return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]');
    } catch {
        return [];
    }
}

function saveFavorites(ids: string[]): void {
    try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
    } catch {
        // ignore quota errors
    }
}

interface IconEntry {
    iconId: string;
    pack: IconPack;
    def: IconDef;
}

interface IconTileProps {
    pack: IconPack;
    def: IconDef;
    selected: boolean;
    onClick: () => void;
}

const IconTile: React.FC<IconTileProps> = ({ pack, def, selected, onClick }) => (
    <button
        type="button"
        className={`picker-tile picker-tile-icon${selected ? ' selected' : ''}`}
        onClick={onClick}
        title={def.label}
        data-testid={`icon-tile-${def.label}`}
    >
        <svg
            viewBox={`0 0 ${pack.viewBox} ${pack.viewBox}`}
            stroke="currentColor"
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {renderIconPaths(def)}
        </svg>
        <span className="picker-tile-label">{def.label}</span>
    </button>
);

export interface IconPickerModalProps {
    open: boolean;
    currentIconId: string;
    onSelect: (iconId: string) => void;
    onClose: () => void;
}

const IconPickerModal: React.FC<IconPickerModalProps> = ({
    open,
    currentIconId,
    onSelect,
    onClose,
}) => {
    const [favorites, setFavorites] = useState<string[]>(loadFavorites);
    const [activeTab, setActiveTab] = useState<'favorites' | string>('favorites');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);

    useEffect(() => {
        if (open) {
            setFavorites(loadFavorites());
            setSearch('');
            setPage(0);
        }
    }, [open]);

    const allEntries = useMemo<IconEntry[]>(() => {
        if (activeTab === 'favorites') {
            return favorites.flatMap((iconId) => {
                const found = findIconDef(iconId);
                return found ? [{ iconId, pack: found.pack, def: found.def }] : [];
            });
        }
        const pack = ALL_PACKS.find((p) => p.id === activeTab);
        if (!pack) return [];
        return Object.entries(pack.icons).map(([key, def]) => ({
            iconId: `${pack.id}:${key}`,
            pack,
            def,
        }));
    }, [activeTab, favorites]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return q ? allEntries.filter(({ def }) => def.label.toLowerCase().includes(q)) : allEntries;
    }, [allEntries, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ICONS_PER_PAGE));
    const currentPage = Math.min(page, totalPages - 1);
    const pageIcons = filtered.slice(
        currentPage * ICONS_PER_PAGE,
        (currentPage + 1) * ICONS_PER_PAGE,
    );

    useEffect(() => setPage(0), [activeTab, search]);

    const handleSelect = useCallback(
        (iconId: string) => {
            setFavorites((prev) => {
                const next = [iconId, ...prev.filter((id) => id !== iconId)].slice(0, MAX_FAVORITES);
                saveFavorites(next);
                return next;
            });
            onSelect(iconId);
            onClose();
        },
        [onSelect, onClose],
    );

    return (
        <Modal open={open} onClose={onClose} size="md" className="picker-modal" data-testid="icon-picker-modal">
            <Modal.Header>
                <Modal.Title>Pick an Icon</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="picker-modal-body">
                    <div className="picker-modal-header-row">
                        <Search size={16} color="#666" />
                        <Input
                            className="picker-modal-search"
                            value={search}
                            onChange={setSearch}
                            placeholder="Search icons…"
                            size="sm"
                        />
                    </div>

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
                        {ALL_PACKS.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                className={`picker-tab${activeTab === p.id ? ' active' : ''}`}
                                onClick={() => setActiveTab(p.id)}
                            >
                                {p.name}
                                <span className="picker-tab-count">{Object.keys(p.icons).length}</span>
                            </button>
                        ))}
                    </div>

                    <div className="picker-grid-scroll">
                        {pageIcons.length === 0 ? (
                            <div className="picker-empty">
                                {activeTab === 'favorites' && favorites.length === 0 && !search ? (
                                    <>
                                        <Star size={32} opacity={0.4} />
                                        <span>No favorites yet</span>
                                        <span className="picker-empty-sub">Icons you pick will appear here</span>
                                    </>
                                ) : (
                                    <span>No icons match &ldquo;{search}&rdquo;</span>
                                )}
                            </div>
                        ) : (
                            <div className="picker-grid picker-grid-icons">
                                {pageIcons.map(({ iconId, pack, def }) => (
                                    <IconTile
                                        key={iconId}
                                        pack={pack}
                                        def={def}
                                        selected={iconId === currentIconId}
                                        onClick={() => handleSelect(iconId)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {totalPages > 1 && (
                        <div className="picker-pagination">
                            <Button
                                size="xs"
                                disabled={currentPage === 0}
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                            >
                                <ChevronLeft size={14} /> Prev
                            </Button>
                            <span className="picker-pagination-info">
                                {currentPage + 1} / {totalPages}
                            </span>
                            <Button
                                size="xs"
                                disabled={currentPage >= totalPages - 1}
                                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            >
                                Next <ChevronRight size={14} />
                            </Button>
                        </div>
                    )}
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default IconPickerModal;
