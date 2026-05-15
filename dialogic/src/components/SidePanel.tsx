import React, { useCallback, useMemo, useState } from 'react';
import { Input, InputGroup, Nav, Sidenav } from 'rsuite';
import { useLocation, useNavigate } from 'react-router-dom';
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
  handlers: IUpds;
}

const SidePanel: React.FC<ISidePanelProps> = ({ game, handlers }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [newDialogName, setNewDialogName] = useState<string>('');

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const activeSection = pathSegments[0] ?? 'dialog';
  const activeDialogFromUrl = activeSection === 'dialog' ? decodeURIComponent(pathSegments[1] ?? '') : '';

  const activeKey = useMemo(() => {
    if (activeSection === 'dialog' && activeDialogFromUrl) return activeDialogFromUrl;
    return activeSection;
  }, [activeSection, activeDialogFromUrl]);

  const handleCreateDialog = useCallback(() => {
    const name = newDialogName.trim();
    if (!name) return;
    setNewDialogName('');
    const dialog = createDialog(name);
    handlers.handleDialogCreate(dialog);
    navigate(`/dialog/${encodeURIComponent(dialog.name)}`);
  }, [newDialogName, handlers, navigate]);

  const handleInputChange = useCallback((value: string) => {
    setNewDialogName(value);
  }, []);

  const dialogsList = useMemo(
    () =>
      game.dialogs.map((d: Dialog) => (
        <Nav.Item
          className="side-panel-dialog"
          eventKey={d.name}
          title={d.name}
          key={d.name}
          active={activeSection === 'dialog' && activeDialogFromUrl === d.name}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/dialog/${encodeURIComponent(d.name)}`);
          }}
        >
          {d.name}
        </Nav.Item>
      )),
    [game.dialogs, navigate, activeSection, activeDialogFromUrl]
  );

  return (
    <div className="main-sidebar" style={{ width: 240 }}>
      <Sidenav defaultOpenKeys={['3', '4']}>
        <Sidenav.Body>
          <Nav activeKey={activeKey}>
            <Nav.Item
              eventKey="saveload"
              icon={<AttachmentIcon />}
              onClick={() => navigate('/saveload')}
            >
              Save / Load
            </Nav.Item>

            <Nav.Item
              eventKey="config"
              icon={<SettingHorizontalIcon />}
              onClick={() => navigate('/config')}
            >
              Game properties
            </Nav.Item>

            <Nav.Item
              eventKey="player"
              icon={<PlayOutlineIcon />}
              onClick={() => navigate('/player')}
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
              onClick={() => navigate('/scripts')}
            >
              Scripts
            </Nav.Item>

            <Nav.Item
              eventKey="chars"
              icon={<IdMappingIcon />}
              onClick={() => navigate('/chars')}
            >
              Characters
            </Nav.Item>

            <Nav.Item
              eventKey="locs"
              icon={<ExploreIcon />}
              onClick={() => navigate('/locs')}
            >
              Locations
            </Nav.Item>

            <Nav.Item
              eventKey="facts"
              icon={<FunnelTimeIcon />}
              onClick={() => navigate('/facts')}
            >
              Facts & Objectives
            </Nav.Item>

            <Nav.Item
              eventKey="items"
              icon={<DeviceOtherIcon />}
              onClick={() => navigate('/items')}
            >
              Items
            </Nav.Item>

            <Nav.Item
              eventKey="ui"
              icon={<TreemapIcon />}
              onClick={() => navigate('/ui')}
            >
              UI Elements
            </Nav.Item>

            <Nav.Item
              eventKey="pac"
              icon={<Icon as={() => <SquareDashedMousePointer />} />}
              onClick={() => navigate('/pac')}
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
