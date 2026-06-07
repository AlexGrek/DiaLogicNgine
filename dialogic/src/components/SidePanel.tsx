import React, { useCallback, useMemo, useRef, useState } from 'react';
import ConfirmationDialog from './ConfirmationDialog';
import { useLocation, useNavigate } from 'react-router-dom';
import HomeIcon from '@rsuite/icons/legacy/Home';
import MagicIcon from '@rsuite/icons/legacy/Magic';
import { GameDescription } from '../game/GameDescription';
import Dialog, { createDialog } from '../game/Dialog';
import SettingHorizontalIcon from '@rsuite/icons/SettingHorizontal';
import ToolsIcon from '@rsuite/icons/Tools';
import AttachmentIcon from '@rsuite/icons/Attachment';
import IdMappingIcon from '@rsuite/icons/IdMapping';
import PlayOutlineIcon from '@rsuite/icons/PlayOutline';
import FunnelTimeIcon from '@rsuite/icons/FunnelTime';
import DeviceOtherIcon from '@rsuite/icons/DeviceOther';
import ExploreIcon from '@rsuite/icons/Explore';
import TreemapIcon from '@rsuite/icons/Treemap';
import { IUpds } from '../App';
import { ChevronDown, ChevronRight, Plus, SquareDashedMousePointer } from 'lucide-react';
import './side-panel.css';

export interface ISidePanelProps {
  game: GameDescription;
  handlers: IUpds;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => (
  <button
    className={`sp-item${active ? ' sp-item--active' : ''}`}
    onClick={onClick}
    title={label}
  >
    <span className="sp-item-icon">{icon}</span>
    <span className="sp-item-label">{label}</span>
  </button>
);

const SidePanel: React.FC<ISidePanelProps> = ({ game, handlers }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [newDialogName, setNewDialogName] = useState('');
  const [confirmHome, setConfirmHome] = useState(false);
  const [dialogsOpen, setDialogsOpen] = useState(true);
  const [showAddInput, setShowAddInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const activeSection = pathSegments[0] ?? 'home';
  const activeDialog = activeSection === 'dialog' ? decodeURIComponent(pathSegments[1] ?? '') : '';

  const isActive = (key: string) => {
    if (key === 'home') return location.pathname === '/';
    return activeSection === key;
  };

  const handleCreateDialog = useCallback(() => {
    const name = newDialogName.trim();
    if (!name) return;
    setNewDialogName('');
    setShowAddInput(false);
    const dialog = createDialog(name);
    handlers.handleDialogCreate(dialog);
    navigate(`/dialog/${encodeURIComponent(dialog.name)}`);
  }, [newDialogName, handlers, navigate]);

  const handleAddClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDialogsOpen(true);
    setShowAddInput(true);
    setTimeout(() => inputRef.current?.focus(), 30);
  }, []);

  const dialogsList = useMemo(
    () =>
      game.dialogs.map((d: Dialog) => (
        <button
          key={d.name}
          className={`sp-dialog-item${activeSection === 'dialog' && activeDialog === d.name ? ' sp-dialog-item--active' : ''}`}
          title={d.name}
          onClick={() => navigate(`/dialog/${encodeURIComponent(d.name)}`)}
        >
          <span className="sp-dialog-dot" />
          <span className="sp-dialog-label">{d.name}</span>
        </button>
      )),
    [game.dialogs, navigate, activeSection, activeDialog]
  );

  return (
    <div className="sp-container" style={{ width: 220 }}>
      <nav className="sp-nav">

        {/* ── file section ── */}
        <div className="sp-section">
          <NavItem icon={<HomeIcon />} label="Home" active={isActive('home')} onClick={() => setConfirmHome(true)} />
          <NavItem icon={<AttachmentIcon />} label="Save / Load" active={isActive('saveload')} onClick={() => navigate('/saveload')} />
        </div>

        <div className="sp-divider" />

        {/* ── game section ── */}
        <div className="sp-section">
          <NavItem icon={<SettingHorizontalIcon />} label="Game Properties" active={isActive('config')} onClick={() => navigate('/config')} />
          <NavItem icon={<PlayOutlineIcon />} label="Play" active={isActive('player')} onClick={() => navigate('/player')} />
          <NavItem icon={<PlayOutlineIcon />} label="Play (Phaser)" active={isActive('playerv2')} onClick={() => navigate('/playerv2')} />
        </div>

        <div className="sp-divider" />

        {/* ── content section ── */}
        <div className="sp-section">
          {/* Dialogs group */}
          <div className="sp-group-header" onClick={() => setDialogsOpen(o => !o)}>
            <span className="sp-group-header-icon"><MagicIcon /></span>
            <span className="sp-group-header-label">Dialogs</span>
            <span className="sp-group-header-chevron">
              {dialogsOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            </span>
            <button className="sp-add-btn" onClick={handleAddClick} title="New dialog">
              <Plus size={12} />
            </button>
          </div>

          {dialogsOpen && (
            <div className="sp-dialogs-list">
              {showAddInput && (
                <div className="sp-add-dialog-row">
                  <input
                    ref={inputRef}
                    className="sp-add-dialog-input"
                    placeholder="Dialog name…"
                    value={newDialogName}
                    onChange={e => setNewDialogName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleCreateDialog();
                      if (e.key === 'Escape') { setShowAddInput(false); setNewDialogName(''); }
                    }}
                  />
                  <button
                    className="sp-add-dialog-confirm"
                    onClick={handleCreateDialog}
                    disabled={!newDialogName.trim()}
                  >
                    <Plus size={11} />
                  </button>
                </div>
              )}
              {dialogsList}
            </div>
          )}

          <NavItem icon={<ToolsIcon />} label="Scripts" active={isActive('scripts')} onClick={() => navigate('/scripts')} />
          <NavItem icon={<IdMappingIcon />} label="Characters" active={isActive('chars')} onClick={() => navigate('/chars')} />
          <NavItem icon={<ExploreIcon />} label="Locations" active={isActive('locs')} onClick={() => navigate('/locs')} />
          <NavItem icon={<FunnelTimeIcon />} label="Facts & Objectives" active={isActive('facts')} onClick={() => navigate('/facts')} />
          <NavItem icon={<DeviceOtherIcon />} label="Items" active={isActive('items')} onClick={() => navigate('/items')} />
          <NavItem icon={<TreemapIcon />} label="UI Elements" active={isActive('ui')} onClick={() => navigate('/ui')} />
          <NavItem
            icon={<SquareDashedMousePointer size={14} />}
            label="Point & Click"
            active={isActive('pac')}
            onClick={() => navigate('/pac')}
          />
        </div>

      </nav>

      {confirmHome && (
        <ConfirmationDialog
          header="Go to Home?"
          text="Any unsaved changes will be lost. Go to the home page?"
          onConfirm={() => { setConfirmHome(false); navigate('/'); }}
          onClose={() => setConfirmHome(false)}
        />
      )}
    </div>
  );
};

export default React.memo(SidePanel);
