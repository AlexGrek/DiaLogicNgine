import { Container, Content, CustomProvider, Footer, Header, Sidebar } from 'rsuite';
import './App.css';
import SidePanel from './components/SidePanel';
import Dialog, { DialogWindow } from './game/Dialog';
import { GameDescription, createDefaultGame } from './game/GameDescription';


import * as React from 'react';
import { Notification, NotificationType, NotifyCallback } from './UiNotifications';
import DialogEditor from './components/DialogEditor';
import SaveLoadMenu from './components/menuitems/SaveLoadMenu';
import CharEditorTabs from './components/menuitems/charedit/CharEditorTabs';
import ConfigurationMenu from './components/menuitems/configuration/ConfigurationMenu';
import LocationMenu from './components/menuitems/locedit/LocationMenu';
import ScriptEditMenu from './components/menuitems/scriptedit/ScriptEditMenu';
import NotificationViewPanel from './components/notification/NotificationViewPanel';
import Player from './components/player/Player';
import Loc from './game/Loc';
import Prop from './game/Prop';

export interface AppGameRuntimeProps {

}

export interface AppGameRuntimeState {
  game: GameDescription
}

export interface IUpds {
  handleDialogEdit: (dialog: Dialog) => void;
  handleDialogCreate: (dialog: Dialog) => void;
  handleDialogApplyChange: (func: DialogWindowListUpdater, dialog_uid: string | null) => void;
  handleDialogWindowChange: (window: DialogWindow, dialog_uid: string | null) => void;
  handleLocChange: (locs: Loc[]) => void;
  handlePropChange: (props: Prop[]) => void;
  notify: NotifyCallback
}

export interface DialogWindowListUpdater {
  (inputDialogWindows: DialogWindow[]): DialogWindow[]
}

export default class AppGameRuntime extends React.Component<AppGameRuntimeProps, AppGameRuntimeState> {

  constructor(props: AppGameRuntimeProps, state: AppGameRuntimeState) {
    super(props);


    let game = createDefaultGame()

    this.state = {
      game: game
    };
  }

  public render() {
    return <CustomProvider theme="dark">
      <Player game={this.state.game} visible={true}></Player>
    </CustomProvider>
  }
}
