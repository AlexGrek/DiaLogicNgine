import * as React from 'react';
import { Input, InputGroup, Nav, Sidenav } from 'rsuite';
import DashboardIcon from '@rsuite/icons/legacy/Dashboard';
import MagicIcon from '@rsuite/icons/legacy/Magic';
import { GameDescription } from '../game/GameDescription';
import Dialog from '../game/Dialog';
import PlusRound from '@rsuite/icons/PlusRound';
import { stringToObject } from 'rsuite/esm/utils';
import { IUpds } from '../App';

export interface ISidePanelProps {
  game: GameDescription
  activeDialog?: string;
  onDialogChange: (s: string) => void
  handlers: IUpds
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
    this.setState({ newDialogname: "" })
    let dialog = this.createDialog(name);
    this.props.handlers.handleDialogCreate(dialog);
  }

  private createDialog(name: string) {
    let dialog = { name: name, windows: [] }
    return dialog;
  }

  addDialogInputHandler(update: string) {
    this.setState({ newDialogname: update });
  }

  public render() {
    return (
      <div style={{ width: 240 }}>
        <Sidenav defaultOpenKeys={['3', '4']}>
          <Sidenav.Body>
            <Nav activeKey={this.props.activeDialog}>
              <Nav.Item eventKey="1" icon={<DashboardIcon />}>
                Dashboard
              </Nav.Item>
              <Nav.Item eventKey="2" icon={<DashboardIcon />}>
                Next
              </Nav.Item>
              <Nav.Menu eventKey="3" title="Dialogs" icon={<MagicIcon />}>
                <Nav.Item>
                  <InputGroup>
                    <Input placeholder="Add dialog" value={this.state.newDialogname} onChange={this.addDialogInputHandler.bind(this)} />
                    <InputGroup.Button disabled={this.state.newDialogname.length === 0} onClick={this.handleCreateDialog.bind(this)}>
                      <PlusRound />
                    </InputGroup.Button>
                  </InputGroup>
                </Nav.Item>
                {this.dialogs(this.props.game.dialogs)}
              </Nav.Menu>
            </Nav>
          </Sidenav.Body>
        </Sidenav>
      </div>
    );
  }
}
