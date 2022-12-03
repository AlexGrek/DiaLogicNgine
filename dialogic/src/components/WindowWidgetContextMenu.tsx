import * as React from 'react';
import { DialogWindow } from '../game/Dialog';
import MoreIcon from '@rsuite/icons/More';
import { Dropdown } from 'rsuite';
import ConfirmationDialog from './ConfirmationDialog';
import { IUpds } from '../App';

export interface IWindowWidgetContextMenuProps {
  window: DialogWindow;
  handlers: IUpds;
}

export interface IWindowWidgetContextMenuState {
  deleteOpen: boolean;
}

export default class WindowWidgetContextMenu extends React.Component<IWindowWidgetContextMenuProps, IWindowWidgetContextMenuState> {

  constructor(props: IWindowWidgetContextMenuProps) {
    super(props)

    this.state = {
      deleteOpen: false
    }
  }

  deleteClick = (e: any) => {
    this.setState({deleteOpen: true})
  }

  closeAll = () => {
    this.setState({
      deleteOpen: false
    })
  }

  confirmationMenu() {
    if (this.state.deleteOpen) {
      const uid = this.props.window.uid;
      const textOf = "Are you sure you want to delete the following window:";
      const closeAllbinded = this.closeAll.bind(this)
      const listUpdater = (list: DialogWindow[]) => {
        return list.filter(e => e.uid !== uid);
      }
      const deleteEvent = () => {
        closeAllbinded()
        this.props.handlers.handleDialogApplyChange(listUpdater, null)
      }
      return <ConfirmationDialog text={uid} header={textOf} onConfirm={deleteEvent} onClose={closeAllbinded}></ConfirmationDialog>
    }
    else return "";
  }

  public render() {
    return <div>
      {this.confirmationMenu()}
      <Dropdown noCaret title={<span><MoreIcon/></span>}>
      <Dropdown.Item>Duplicate</Dropdown.Item>
      <Dropdown.Item>Rename</Dropdown.Item>
      <Dropdown.Item>Copy and rename</Dropdown.Item>
      <Dropdown.Item onClick={this.deleteClick.bind(this)}>Delete</Dropdown.Item>
    </Dropdown>
    </div>
  }
}

