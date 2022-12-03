import * as React from 'react';
import Dialog, { DialogWindow } from '../game/Dialog';
import EditIcon from '@rsuite/icons/Edit';
import CloseIcon from '@rsuite/icons/Close';
import MoreIcon from '@rsuite/icons/More';
import { Button, ButtonGroup, Panel, Placeholder, Stack, Col } from 'rsuite';
import Renamer from './Renamer';
import WindowWidgetContextMenu from './WindowWidgetContextMenu';
import { IUpds } from '../App';
import { GameDescription } from '../game/GameDescription';

export interface IWindowEditorProps {
  window: DialogWindow;
  dialog: Dialog;
  handlers: IUpds;
  onWindowChosen: Function;
  game: GameDescription;
}

export interface IWindowEditorState {
  confirmerOpen: boolean;
}

export default class WindowEditor extends React.Component<IWindowEditorProps, IWindowEditorState> {

  constructor(props: IWindowEditorProps) {
    super(props)

    this.state = {
      confirmerOpen: false
    }
  }

  public textShortened(text: string, max: number): string {
    if (text.length > max) {
      return text.substring(0, max - 3) + "..."
    }
    else {
      return text
    }
  }

  strs = "some bullshit but a bit long text to test this shit, while still waiting for him to fuck your soul away from your body"

  public render() {
    return <Col md={6} sm={12}>
      <div className="window-widget-main">
        <div className="window-widget-header">
          <Stack justifyContent='space-between'>
            <span className='window-widget-ui-text'>{this.props.window.uid}</span>
            <span className='window-widget-icons'></span>
            <WindowWidgetContextMenu game={this.props.game} dialog={this.props.dialog} handlers={this.props.handlers} window={this.props.window}></WindowWidgetContextMenu>
          </Stack>
        </div>
        <div className='window-widget-content' onClick={() => this.props.onWindowChosen()}>
          <p className='window-widget-content-text'>
            {this.textShortened(this.props.window.text.toString(), 84)}
          </p>
        </div>
        <div className='window-widget-footer' onClick={() => this.props.onWindowChosen()}>
          <li className='window-widget-links-list'>
            <ul>Link 1</ul>
            <ul>Link 2</ul>
            <ul>Link 3 external</ul>
          </li>
        </div>
      </div>
    </Col>
  }
}

