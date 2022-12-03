import * as React from 'react';
import Dialog, { DialogWindow } from '../game/Dialog';
import { Panel, Placeholder } from 'rsuite';
import WindowEditor from './WindowEditor';
import CreateWindowButton from './CreateWindowButton';
import { IUpds } from '../App';
import DialogWindowEditDrawer from './DialogWindowEditDrawer';
import { GameDescription } from '../game/GameDescription';

export interface IDialogEditorProps {
  dialog?: Dialog;
  handlers: IUpds;
  game: GameDescription;
}

export interface IDialogEditorState {
  editorOpen: boolean;
  editingWindow: DialogWindow | undefined;
}

export default class DialogEditor extends React.Component<IDialogEditorProps, IDialogEditorState> {
  public constructor(props: IDialogEditorProps) {
    super(props)

    this.state = {
      editorOpen: false,
      editingWindow: undefined
    }
  }

  public render() {
    if (this.props.dialog) {
      return this.renderDialog(this.props.dialog.windows);
    } else {
      return <Panel header="Select dialog in the left panel" shaded>
        <Placeholder.Paragraph />
      </Panel>
    }
  }

  private itemReference = React.createRef<HTMLDivElement>()

  public createDialogHandler(newWindow: DialogWindow) {
    if (this.props.dialog) {
      console.log(`Creating new dialog window: {newWindow}`)
      let updatedWinList = this.props.dialog.windows.concat(newWindow);
      this.props.handlers.handleDialogEdit({ ...this.props.dialog, windows: updatedWinList })
      if (this.itemReference.current) {
        this.itemReference.current.scrollIntoView({ block: 'end', behavior: 'smooth' })
      }
    }
  }

  private windowChosenHandler(window: DialogWindow) {
    this.setState({ editingWindow: window, editorOpen: true })
  }

  private closeWindowEditorHandler() {
    this.setState({editorOpen: false})
  }

  public renderWindows(windows: DialogWindow[], dialog: Dialog) {
    return windows.map(win =>
      <WindowEditor game={this.props.game} dialog={dialog} window={win} key={win.uid} handlers={this.props.handlers} onWindowChosen={() => this.windowChosenHandler(win)}></WindowEditor>)
  }

  public renderDialog(windows: DialogWindow[]) {
    return (
      <div ref={this.itemReference}>
        <p>
          {JSON.stringify(this.props.dialog)}
        </p>
        <CreateWindowButton createHandler={this.createDialogHandler.bind(this)}></CreateWindowButton>
        <div>
          {
            this.props.dialog ?
              this.renderWindows(windows, this.props.dialog) : ""
          }
        </div>
        {(this.state.editingWindow && this.props.dialog) ? <DialogWindowEditDrawer game={this.props.game} open={this.state.editorOpen} window={this.state.editingWindow} dialog={this.props.dialog} onClose={this.closeWindowEditorHandler.bind(this)} handlers={this.props.handlers}></DialogWindowEditDrawer> : ""}
      </div>
    );
  }
}
