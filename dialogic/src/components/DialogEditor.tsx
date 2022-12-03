import * as React from 'react';
import Dialog, { DialogWindow } from '../game/Dialog';
import { Panel, Placeholder } from 'rsuite';
import WindowEditor from './WindowEditor';
import CreateWindowButton from './CreateWindowButton';
import { IUpds } from '../App';

export interface IDialogEditorProps {
    dialog?: Dialog;
    handlers: IUpds;
}

export default class DialogEditor extends React.Component<IDialogEditorProps> {

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
      this.props.handlers.handleDialogEdit({...this.props.dialog, windows: updatedWinList})
      if (this.itemReference.current) {
        this.itemReference.current.scrollIntoView({block: 'end', behavior: 'smooth'})
      }
    }
  }

  public renderWindows(windows: DialogWindow[], dialog: Dialog) {
    return windows.map(win =>
      <WindowEditor dialog={dialog} window={win} key={win.uid} handlers={this.props.handlers}></WindowEditor>)
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
      </div>
    );
  }
}
