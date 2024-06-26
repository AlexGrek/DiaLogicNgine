import * as React from 'react';
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

export interface ISidePanelProps {
  game: GameDescription
  activeDialog?: string;
  onDialogChange: (s: string) => void
  handlers: IUpds
  onMenuSwitch: (s: string) => void
  activeMenu: string
}

interface ISidePanelState {
  newDialogname: string;
}

export default class SidePanel extends React.Component<ISidePanelProps, ISidePanelState> {

  constructor(props: ISidePanelProps) {
    super(props);

    this.state = {
      newDialogname: ""
    };
  }

  public dialogs(dialogs: Dialog[]) {
    let items = dialogs.map((d) => <Nav.Item
    className='side-panel-dialog'
      eventKey={d.name}
      title={d.name}
      key={d.name}
      onClick={this.handleDialogClick.bind(this)}>
      {d.name}
    </Nav.Item>)
    return items
  }

  private handleDialogClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();

    const button = e.currentTarget;
    this.props.onDialogChange(button.title);
  }

  private handleCreateDialog(_: any) {
    let name = this.state.newDialogname;
    this.setState({ newDialogname: "" });
    let dialog = createDialog(name);
    this.props.handlers.handleDialogCreate(dialog);
  }

  addDialogInputHandler(update: string) {
    this.setState({ newDialogname: update });
  }

  public render() {
    let activeKey = this.props.activeMenu;
    if (activeKey === "dialog" && this.props.activeDialog) {
      activeKey = this.props.activeDialog
    }

    return (
      <div className='main-sidebar' style={{ width: 240 }}>
        <Sidenav defaultOpenKeys={['3', '4']}>
          <Sidenav.Body>
            <Nav activeKey={activeKey}>
              <Nav.Item eventKey="saveload" icon={<AttachmentIcon />} onClick={() => this.props.onMenuSwitch("saveload")}>
                Save / Load
              </Nav.Item>
              <Nav.Item eventKey="config" icon={<SettingHorizontalIcon />} onClick={() => this.props.onMenuSwitch("config")}>
                Game properties
              </Nav.Item>
              <Nav.Item eventKey="player" icon={<PlayOutlineIcon />} onClick={() => this.props.onMenuSwitch("player")}>
                Play
              </Nav.Item>
              <Nav.Menu eventKey="4" title="Dialogs" icon={<MagicIcon />}>
                <Nav.Item className='side-panel-dialog-create'>
                  <InputGroup>
                    <Input name='add-dialog' placeholder="Add dialog" value={this.state.newDialogname} onPressEnter={this.handleCreateDialog.bind(this)} onChange={this.addDialogInputHandler.bind(this)} />
                    <InputGroup.Button disabled={this.state.newDialogname.length === 0} onClick={this.handleCreateDialog.bind(this)}>
                      <PlusRound />
                    </InputGroup.Button>
                  </InputGroup>
                </Nav.Item>
                {this.dialogs(this.props.game.dialogs)}
              </Nav.Menu>
              <Nav.Item eventKey="scripts" icon={<ToolsIcon />} onClick={() => this.props.onMenuSwitch("scripts")}>
                Scripts
              </Nav.Item>
              <Nav.Item eventKey="chars" icon={<IdMappingIcon />} onClick={() => this.props.onMenuSwitch("chars")}>
                Characters
              </Nav.Item>
              <Nav.Item eventKey="locs" icon={<ExploreIcon />} onClick={() => this.props.onMenuSwitch("locs")}>
                Locations
              </Nav.Item>
              <Nav.Item eventKey="facts" icon={<FunnelTimeIcon />} onClick={() => this.props.onMenuSwitch("facts")}>
                Facts & Objectives
              </Nav.Item>
              <Nav.Item eventKey="items" icon={<DeviceOtherIcon />} onClick={() => this.props.onMenuSwitch("items")}>
                Items
              </Nav.Item>
              <Nav.Item eventKey="ui" icon={<TreemapIcon />} onClick={() => this.props.onMenuSwitch("ui")}>
                UI Elements
              </Nav.Item>
            </Nav>
          </Sidenav.Body>
        </Sidenav>
      </div>
    );
  }
}
