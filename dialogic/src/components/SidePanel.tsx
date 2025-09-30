import React, { useCallback, useMemo, useState } from 'react';
import { Input, InputGroup, Nav, Sidenav } from 'rsuite';
import MagicIcon from '@rsuite/icons/legacy/Magic';
import { GameDescription } from '../game/GameDescription';
import Dialog, { createDialog } from '../game/Dialog';
import PlusRound from '@rsuite/icons/PlusRound';
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
import { SquareDashedMousePointer } from 'lucide-react';
import Icon from '@rsuite/icons/lib/Icon';

export interface ISidePanelProps {
  game: GameDescription;
  activeDialog?: string;
  onDialogChange: (s: string) => void;
  handlers: IUpds;
  onMenuSwitch: (s: string) => void;
  activeMenu: string;
}

/**
 * Modern, memoized SidePanel that preserves original layout & styling.
 * See original file for behavior reference: :contentReference[oaicite:1]{index=1}
 */
const SidePanel: React.FC<ISidePanelProps> = ({
  game,
  activeDialog,
  onDialogChange,
  handlers,
  onMenuSwitch,
  activeMenu,
}) => {
  const [newDialogName, setNewDialogName] = useState<string>('');

  const handleCreateDialog = useCallback(() => {
    const name = newDialogName.trim();
    if (!name) return;
    setNewDialogName('');
    const dialog = createDialog(name);
    handlers.handleDialogCreate(dialog);
    // navigate user to dialogs (keeps UX consistent)
    onMenuSwitch('dialog');
    onDialogChange(dialog.name);
  }, [newDialogName, handlers, onDialogChange, onMenuSwitch]);

  const handleInputChange = useCallback((value: string) => {
    setNewDialogName(value);
  }, []);

  const handleDialogClick = useCallback(
    (name: string) => {
      onDialogChange(name);
      // ensure menu is switched to dialog view
      onMenuSwitch('dialog');
    },
    [onDialogChange, onMenuSwitch]
  );

  const dialogsList = useMemo(
    () =>
      game.dialogs.map((d: Dialog) => (
        <Nav.Item
          className="side-panel-dialog"
          eventKey={d.name}
          title={d.name}
          key={d.name}
          active={activeMenu === 'dialog' && activeDialog === d.name}
          onClick={(e) => {
            e.preventDefault();
            handleDialogClick(d.name);
          }}
        >
          {d.name}
        </Nav.Item>
      )),
    [game.dialogs, handleDialogClick, activeDialog, activeMenu]
  );

  // preserve original activeKey behaviour:
  let activeKey: string | undefined = activeMenu;
  if (activeMenu === 'dialog' && activeDialog) {
    activeKey = activeDialog;
  }

  return (
    <div className="main-sidebar" style={{ width: 240 }}>
      <Sidenav defaultOpenKeys={['3', '4']}>
        <Sidenav.Body>
          <Nav activeKey={activeKey}>
            <Nav.Item
              eventKey="saveload"
              icon={<AttachmentIcon />}
              onClick={() => onMenuSwitch('saveload')}
            >
              Save / Load
            </Nav.Item>

            <Nav.Item
              eventKey="config"
              icon={<SettingHorizontalIcon />}
              onClick={() => onMenuSwitch('config')}
            >
              Game properties
            </Nav.Item>

            <Nav.Item
              eventKey="player"
              icon={<PlayOutlineIcon />}
              onClick={() => onMenuSwitch('player')}
            >
              Play
            </Nav.Item>

            <Nav.Menu eventKey="4" title="Dialogs" icon={<MagicIcon />}>
              <Nav.Item className="side-panel-dialog-create">
                <InputGroup>
                  <Input
                    name="add-dialog"
                    placeholder="Add dialog"
                    value={newDialogName}
                    onPressEnter={handleCreateDialog}
                    onChange={handleInputChange}
                  />
                  <InputGroup.Button
                    disabled={newDialogName.trim().length === 0}
                    onClick={handleCreateDialog}
                  >
                    <PlusRound />
                  </InputGroup.Button>
                </InputGroup>
              </Nav.Item>

              {dialogsList}
            </Nav.Menu>

            <Nav.Item
              eventKey="scripts"
              icon={<ToolsIcon />}
              onClick={() => onMenuSwitch('scripts')}
            >
              Scripts
            </Nav.Item>

            <Nav.Item
              eventKey="chars"
              icon={<IdMappingIcon />}
              onClick={() => onMenuSwitch('chars')}
            >
              Characters
            </Nav.Item>

            <Nav.Item
              eventKey="locs"
              icon={<ExploreIcon />}
              onClick={() => onMenuSwitch('locs')}
            >
              Locations
            </Nav.Item>

            <Nav.Item
              eventKey="facts"
              icon={<FunnelTimeIcon />}
              onClick={() => onMenuSwitch('facts')}
            >
              Facts & Objectives
            </Nav.Item>

            <Nav.Item
              eventKey="items"
              icon={<DeviceOtherIcon />}
              onClick={() => onMenuSwitch('items')}
            >
              Items
            </Nav.Item>

            <Nav.Item
              eventKey="ui"
              icon={<TreemapIcon />}
              onClick={() => onMenuSwitch('ui')}
            >
              UI Elements
            </Nav.Item>

            {/* NOTE: App previously used "poc" as the menu key. If you want to keep the original SidePanel key ("pac"), change this eventKey back. */}
            <Nav.Item
              eventKey="pac"
              icon={<Icon as={() => <SquareDashedMousePointer />} />}
              onClick={() => onMenuSwitch('pac')}
            >
              Point And Click
            </Nav.Item>
          </Nav>
        </Sidenav.Body>
      </Sidenav>
    </div>
  );
};

export default React.memo(SidePanel);
