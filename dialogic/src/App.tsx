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

  private handleDialogCreate(dialog: Dialog) {
    let newDialogs = this.state.game.dialogs.concat(dialog);
    this.setState({game: {...this.state.game, dialogs: newDialogs}})
  }

  public render() {
    let updates = {
      handleDialogEdit: this.handleDialogEdit.bind(this),
      handleDialogCreate: this.handleDialogCreate.bind(this)
    }

    let chosenDialog = this.state.game.dialogs.find(d => d.name === this.state.activeDialog);
    return (
      <CustomProvider theme="dark">
      <Container>
    <Header>Header</Header>
    <Container>
      <Sidebar>
        <SidePanel game={this.state.game}
          activeDialog={this.state.activeDialog}
          onDialogChange={this.handleChangeDialog.bind(this)}
          handlers={updates}></SidePanel>
      </Sidebar>
      <Content>
        <DialogEditor handlers={updates} dialog={chosenDialog}/>
      </Content>
    </Container>
    <Footer>Footer</Footer>
  </Container>
  </CustomProvider>);
  }
}
