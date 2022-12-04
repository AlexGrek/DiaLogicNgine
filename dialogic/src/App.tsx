import './App.css';
import SidePanel from './components/SidePanel';
import { Container, Header, Content, Footer, Sidebar } from 'rsuite';
import { CustomProvider } from 'rsuite';
import { GameDescription } from './game/GameDescription';
import Dialog, { DialogWindow } from './game/Dialog';


import * as React from 'react';
import DialogEditor from './components/DialogEditor';

export interface IAppProps {

}

export interface IAppState {
  activeDialog: string
  game: GameDescription
}

export interface IUpds {
  handleDialogEdit: (dialog: Dialog) => void;
  handleDialogCreate: (dialog: Dialog) => void;
  handleDialogApplyChange: (func: DialogWindowListUpdater, dialog_uid: string | null) => void;
  handleDialogWindowChange: (window: DialogWindow, dialog_uid: string | null) => void;
}

export interface DialogWindowListUpdater {
  (inputDialogWindows: DialogWindow[]): DialogWindow[]
}

export default class App extends React.Component<IAppProps, IAppState> {

  constructor(props: IAppProps, state: IAppState) {
    super(props);

    
    let d1 = {name: "dialog1", windows: []};
    let d2 = {name: "anotherone", windows: []};
    let game = {dialogs: [ d1, d2 ], facts: []};

    this.state = {
      activeDialog: '1',
      game: game
    };
  }

  private handleChangeDialog(newDialog: string) {
    console.log(newDialog)
    this.setState({activeDialog: newDialog});
  }

  private handleDialogEdit(dialog: Dialog) {
    let newDialogs = this.state.game.dialogs.map(d => {
      if (d.name === dialog.name) {
        console.log(`Dialog ${d.name} updated.`)
        return dialog;
      }
      return d;
    })
    this.setState({game: {...this.state.game, dialogs: newDialogs}});
  }

  private handleDialogApplyChange(func: DialogWindowListUpdater, dialog_uid: string | null) {
    if (!dialog_uid) {
      dialog_uid = this.state.activeDialog
    }
    let newDialogs = this.state.game.dialogs.map(d => {
      if (d.name === dialog_uid) {
        const dialogWindows = func(d.windows);
        const newDialog = {...d, windows: dialogWindows }
        console.log(`Dialog ${d.name} updated.`);
        return newDialog;
      }
      return d;
    })
    this.setState({game: {...this.state.game, dialogs: newDialogs}});
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
    this.setState({game: {...this.state.game, dialogs: newDialogs}})
  }

  public render() {
    let updates = {
      handleDialogEdit: this.handleDialogEdit.bind(this),
      handleDialogCreate: this.handleDialogCreate.bind(this),
      handleDialogApplyChange: this.handleDialogApplyChange.bind(this),
      handleDialogWindowChange: this.handleDialogWindowChange.bind(this)
    }

    let chosenDialog = this.state.game.dialogs.find(d => d.name === this.state.activeDialog);
    return (
      <CustomProvider theme="dark">
      <Container>
    <Header className='app-header-text'>DiaLogic Ngine</Header>
    <Container>
      <Sidebar>
        <SidePanel game={this.state.game}
          activeDialog={this.state.activeDialog}
          onDialogChange={this.handleChangeDialog.bind(this)}
          handlers={updates}></SidePanel>
      </Sidebar>
      <Content>
        <DialogEditor game={this.state.game} handlers={updates} dialog={chosenDialog}/>
      </Content>
    </Container>
    <Footer>Footer</Footer>
  </Container>
  </CustomProvider>);
  }
}
