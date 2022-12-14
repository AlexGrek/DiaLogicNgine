import './App.css';
import SidePanel from './components/SidePanel';
import { Container, Header, Content, Footer, Sidebar } from 'rsuite';
import { CustomProvider } from 'rsuite';
import { createDefaultGame, GameDescription } from './game/GameDescription';
import Dialog, { DialogWindow } from './game/Dialog';


import * as React from 'react';
import DialogEditor from './components/DialogEditor';
import SaveLoadMenu from './components/menuitems/SaveLoadMenu';
import { Notification, NotificationType, NotifyCallback } from './UiNotifications';
import NotificationViewPanel from './components/notification/NotificationViewPanel';
import Player from './components/player/Player';
import ConfigurationMenu from './components/menuitems/configuration/ConfigurationMenu';

export interface IAppProps {

}

export interface IAppState {
  activeDialog: string
  menu: string
  game: GameDescription
  notifications: Notification[]
}

export interface IUpds {
  handleDialogEdit: (dialog: Dialog) => void;
  handleDialogCreate: (dialog: Dialog) => void;
  handleDialogApplyChange: (func: DialogWindowListUpdater, dialog_uid: string | null) => void;
  handleDialogWindowChange: (window: DialogWindow, dialog_uid: string | null) => void;
  notify: NotifyCallback
}

export interface DialogWindowListUpdater {
  (inputDialogWindows: DialogWindow[]): DialogWindow[]
}

export default class App extends React.Component<IAppProps, IAppState> {

  constructor(props: IAppProps, state: IAppState) {
    super(props);


    let game = createDefaultGame()

    this.state = {
      activeDialog: '1',
      game: game,
      menu: "dialog",
      notifications: []
    };
  }

  private handleChangeDialog(newDialog: string) {
    console.log(newDialog)
    this.setState({ activeDialog: newDialog, menu: "dialog" });
  }

  private handleMenuSwitch(newMenu: string) {
    this.setState({ menu: newMenu })
  }

  private handleDialogEdit(dialog: Dialog) {
    let newDialogs = this.state.game.dialogs.map(d => {
      if (d.name === dialog.name) {
        console.log(`Dialog ${d.name} updated.`)
        return dialog;
      }
      return d;
    })
    this.setState({ game: { ...this.state.game, dialogs: newDialogs } });
  }

  private handleDialogApplyChange(func: DialogWindowListUpdater, dialog_uid: string | null) {
    if (!dialog_uid) {
      dialog_uid = this.state.activeDialog
    }
    let newDialogs = this.state.game.dialogs.map(d => {
      if (d.name === dialog_uid) {
        const dialogWindows = func(d.windows);
        const newDialog = { ...d, windows: dialogWindows }
        console.log(`Dialog ${d.name} updated.`);
        return newDialog;
      }
      return d;
    })
    this.setState({ game: { ...this.state.game, dialogs: newDialogs } });
  }

  private handleDialogWindowChange(window: DialogWindow, dialog_uid: string | null) {
    const uid = window.uid;
    console.warn("Handling dialog window change: " + JSON.stringify(window))
    const dialogWindowListChanger = (lst: DialogWindow[]) => {
      return lst.map((element) => {
        if (element.uid === uid) {
          return window;
        } else return element;
      })
    }
    this.handleDialogApplyChange(dialogWindowListChanger, dialog_uid);
  }

  private handleDialogCreate(dialog: Dialog) {
    let newDialogs = this.state.game.dialogs.concat(dialog);
    this.setState({ game: { ...this.state.game, dialogs: newDialogs } })
  }

  private displayStyle(name: string) {
    return {
      display: this.state.menu === name ? "block" : "none"
    }
  }

  private handleNotify(type: NotificationType, text: string, header: string | null) {
    const notif = new Notification(type, text, header);
    const notifications = [...this.state.notifications, notif]
    this.setState({ notifications: notifications })
  }

  private renderContent(updates: IUpds, chosenDialog: Dialog | undefined) {
    return <div>
      <div style={this.displayStyle("dialog")}>
        <DialogEditor game={this.state.game} handlers={updates} dialog={chosenDialog} />
      </div>
      <div style={this.displayStyle("player")}>
        <Player game={this.state.game} handlers={updates} visible={this.state.menu === "player"} />
      </div>
      <div style={this.displayStyle("saveload")}>
        <SaveLoadMenu onNotify={this.handleNotify.bind(this)} onSetGame={(game: GameDescription) => this.setState({ game: game })} currentGame={this.state.game}></SaveLoadMenu>
      </div>
      <div style={this.displayStyle("config")}>
        <ConfigurationMenu onNotify={this.handleNotify.bind(this)} onSetGame={(game: GameDescription) => this.setState({ game: game })} game={this.state.game}/>
      </div>
    </div>
  }

  public render() {
    let updates = {
      handleDialogEdit: this.handleDialogEdit.bind(this),
      handleDialogCreate: this.handleDialogCreate.bind(this),
      handleDialogApplyChange: this.handleDialogApplyChange.bind(this),
      handleDialogWindowChange: this.handleDialogWindowChange.bind(this),
      notify: this.handleNotify.bind(this)
    }

    let chosenDialog = this.state.game.dialogs.find(d => d.name === this.state.activeDialog);
    return (
      <CustomProvider theme="dark">
        <Container>
          <Header className='app-header-text'>DiaLogic Ngine</Header>
          <NotificationViewPanel notifications={this.state.notifications}></NotificationViewPanel>
          <Container>
            <Sidebar>
              <SidePanel game={this.state.game}
                activeMenu={this.state.menu}
                activeDialog={this.state.activeDialog}
                onDialogChange={this.handleChangeDialog.bind(this)}
                onMenuSwitch={this.handleMenuSwitch.bind(this)}
                handlers={updates}></SidePanel>
            </Sidebar>
            <Content>
              {this.renderContent(updates, chosenDialog)}
            </Content>
          </Container>
          <Footer>Footer</Footer>
        </Container>
      </CustomProvider>);
  }
}
