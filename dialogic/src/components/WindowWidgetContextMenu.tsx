import * as React from 'react';
import lodash from 'lodash';
import Dialog, { DialogWindow, renameDialogWindow } from '../game/Dialog';
import MoreIcon from '@rsuite/icons/More';
import { Dropdown } from 'rsuite';
import ConfirmationDialog from './ConfirmationDialog';
import { IUpds } from '../App';
import ChangeTextDialog from './ChangeTextDialog';
import { GameDescription } from '../game/GameDescription';
import DemoPlayerModal from './DemoPlayerModal';
import { toYaml } from '../Trace';

export interface IWindowWidgetContextMenuProps {
  window: DialogWindow;
  dialog: Dialog;
  handlers: IUpds;
  game: GameDescription;
}

export interface IWindowWidgetContextMenuState {
  deleteOpen: boolean;
  renameOpen: boolean;
  copyRenameOpen: boolean;
  demoOpen: boolean;
}

export default class WindowWidgetContextMenu extends React.Component<IWindowWidgetContextMenuProps, IWindowWidgetContextMenuState> {

  constructor(props: IWindowWidgetContextMenuProps) {
    super(props)

    this.state = {
      deleteOpen: false,
      renameOpen: false,
      copyRenameOpen: false,
      demoOpen: false,
    }
  }

  deleteClick = () => {
    this.setState({deleteOpen: true})
  }

  renameClick = () => {
    this.setState({renameOpen: true})
  }

  copyRenameClick = () => {
    this.setState({copyRenameOpen: true})
  }

  duplicateClick = () => {
    const uid = this.props.window.uid;
    const existingUids = new Set(this.props.dialog.windows.map(w => w.uid));
    let newUid = `${uid}_copy`;
    let counter = 2;
    while (existingUids.has(newUid)) {
      newUid = `${uid}_copy_${counter}`;
      counter++;
    }
    const duplicate = lodash.cloneDeep(this.props.window);
    duplicate.uid = newUid;
    this.props.handlers.handleDialogApplyChange(list => [...list, duplicate], null);
  }

  closeAll = () => {
    this.setState({
      deleteOpen: false,
      renameOpen: false,
      copyRenameOpen: false,
      demoOpen: false,
    })
  }

  demoClick = () => {
    this.setState({ demoOpen: true })
  }

  buildDemoPatch() {
    const patch = {
      position: {
        kind: 'window',
        dialog: this.props.dialog.name,
        window: this.props.window.uid,
      },
    };
    return toYaml(patch);
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
              return renameDialogWindow(el, newString);
            }
          })
        }
        this.props.handlers.handleDialogApplyChange(rename, null)
      }
      return (
        <ChangeTextDialog validator={validator} text_prompt="UID must be unique" text_initial={uid} header={textOf} onConfirm={renameEvent} onClose={closeAllbinded}></ChangeTextDialog>)
    }

    if (this.state.copyRenameOpen) {
      const uid = this.props.window.uid;
      const textOf = "Copy window with new UID";
      const wrong_names = this.props.dialog.windows.map(w => w.uid);
      const validator = (s: string) => s.length >= 1 && !wrong_names.includes(s);
      const copyRenameEvent = (newUid: string) => {
        closeAllbinded()
        const duplicate = lodash.cloneDeep(this.props.window);
        duplicate.uid = newUid;
        this.props.handlers.handleDialogApplyChange(list => [...list, duplicate], null);
      }
      return (
        <ChangeTextDialog validator={validator} text_prompt="UID must be unique" text_initial={`${uid}_copy`} header={textOf} onConfirm={copyRenameEvent} onClose={closeAllbinded}></ChangeTextDialog>)
    }

    return "";
  }

  public render() {
    return <div>
      {this.confirmationMenu()}
      <DemoPlayerModal
        game={this.props.game}
        open={this.state.demoOpen}
        onClose={this.closeAll}
        initialPatch={this.buildDemoPatch()}
      />
      <Dropdown noCaret placement="bottomEnd" title={<span><MoreIcon/></span>}>
        <Dropdown.Item onClick={(e) => { e.stopPropagation(); this.demoClick() }}>Demo from here</Dropdown.Item>
        <Dropdown.Separator />
        <Dropdown.Item onClick={(e) => { e.stopPropagation(); this.duplicateClick() }}>Duplicate</Dropdown.Item>
        <Dropdown.Item onClick={(e) => {e.stopPropagation(); this.renameClick()}}>Rename</Dropdown.Item>
        <Dropdown.Item onClick={(e) => { e.stopPropagation(); this.copyRenameClick() }}>Copy and rename</Dropdown.Item>
        <Dropdown.Item onClick={(e) => {e.stopPropagation(); this.deleteClick()}}>Delete</Dropdown.Item>
      </Dropdown>
    </div>
  }
}

