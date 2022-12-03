import * as React from 'react';
import Dialog, { DialogWindow } from '../game/Dialog';
import MoreIcon from '@rsuite/icons/More';
import { Dropdown } from 'rsuite';
import ConfirmationDialog from './ConfirmationDialog';
import { IUpds } from '../App';
import ChangeTextDialog from './ChangeTextDialog';

export interface IWindowWidgetContextMenuProps {
  window: DialogWindow;
  dialog: Dialog;
  handlers: IUpds;
}

export interface IWindowWidgetContextMenuState {
  deleteOpen: boolean;
  renameOpen: boolean;
  copyRenameOpen: boolean;
}

export default class WindowWidgetContextMenu extends React.Component<IWindowWidgetContextMenuProps, IWindowWidgetContextMenuState> {

  constructor(props: IWindowWidgetContextMenuProps) {
    super(props)

    this.state = {
      deleteOpen: false,
      renameOpen: false,
      copyRenameOpen: false
    }
  }

  deleteClick = (e: any) => {
    this.setState({deleteOpen: true})
  }

  renameClick = (e: any) => {
    this.setState({renameOpen: true})
  }

  copyRenameClick = (e: any) => {
    this.setState({copyRenameOpen: true})
  }

  closeAll = () => {
    this.setState({
      deleteOpen: false,
      renameOpen: false,
      copyRenameOpen: false
    })
  }

  confirmationMenu() {
    const closeAllbinded = this.closeAll.bind(this)
    if (this.state.deleteOpen) {
      const uid = this.props.window.uid;
      const textOf = "Are you sure you want to delete the following window:";
      const listUpdater = (list: DialogWindow[]) => {
        return list.filter(e => e.uid !== uid);
      }
      const deleteEvent = () => {
        closeAllbinded()
        this.props.handlers.handleDialogApplyChange(listUpdater, null)
      }
      return <ConfirmationDialog text={uid} header={textOf} onConfirm={deleteEvent} onClose={closeAllbinded}></ConfirmationDialog>
    }

    if (this.state.renameOpen) {
      const uid = this.props.window.uid;
      const textOf = "Rename window (change window UID)";
      const wrong_names = this.props.dialog.windows.map(w => w.uid);
      const validator = (s: string) => s.length >= 1 && !wrong_names.includes(s);
      const renameEvent = (newString: string) => {
        closeAllbinded()
        const rename = (list: DialogWindow[]) => {
          return list.map((el) => {
            if (el.uid !== uid)
              return el;
            else {
              return el.renamed(newString);
            }
          })
        }
        this.props.handlers.handleDialogApplyChange(rename, null)
      }
      return (
        <ChangeTextDialog validator={validator} text_prompt="UID must be unique" text_initial={uid} header={textOf} onConfirm={(str: string) => console.warn(str)} onClose={closeAllbinded}></ChangeTextDialog>)
    }
    return "";
  }

  public render() {
    return <div>
      {this.confirmationMenu()}
      <Dropdown noCaret title={<span><MoreIcon/></span>}>
      <Dropdown.Item>Duplicate</Dropdown.Item>
      <Dropdown.Item onClick={this.renameClick.bind(this)}>Rename</Dropdown.Item>
      <Dropdown.Item>Copy and rename</Dropdown.Item>
      <Dropdown.Item onClick={this.deleteClick.bind(this)}>Delete</Dropdown.Item>
    </Dropdown>
    </div>
  }
}

