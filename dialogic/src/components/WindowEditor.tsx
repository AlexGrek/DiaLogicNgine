import * as React from 'react';
import Dialog, { DialogWindow } from '../game/Dialog';
import EditIcon from '@rsuite/icons/Edit';
import CloseIcon from '@rsuite/icons/Close';
import { Button, ButtonGroup, Panel, Placeholder, Stack } from 'rsuite';
import Renamer from './Renamer';

export interface IWindowEditorProps {
  window: DialogWindow;
}

export interface IWindowEditorState {
  renamerOpen: boolean;
}

export default class WindowEditor extends React.Component<IWindowEditorProps, IWindowEditorState> {

  constructor(props: IWindowEditorProps) {
    super(props)

    this.state = {
      renamerOpen: false
    }
  }

  public render() {
    return <Panel header={
      <Stack justifyContent="space-between">
        <span><span>{this.props.window.uid}</span>
          <Button style={{ "display": "inline" }}
            size="xs"
            appearance="link"
            onClick={() => this.setState({ renamerOpen: !this.state.renamerOpen })}>
            <EditIcon></EditIcon>
          </Button>
          <Button style={{ "display": "inline" }} size="xs" appearance="link">
            <CloseIcon></CloseIcon>
          </Button>
        </span>

        {/* <Renamer open={this.state.renamerOpen}></Renamer> */}

        <ButtonGroup>
          <Button active>Day</Button>
          <Button>Week</Button>
          <Button>Month</Button>
        </ButtonGroup>
      </Stack>
    } bordered={true}>
      <Placeholder.Paragraph />
    </Panel>
  }
}

