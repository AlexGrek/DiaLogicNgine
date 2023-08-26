import * as React from 'react';
import Dialog, { DialogWindow, LinkType } from '../game/Dialog';
import { Stack, Col } from 'rsuite';
import WindowWidgetContextMenu from './WindowWidgetContextMenu';
import { IUpds } from '../App';
import { GameDescription } from '../game/GameDescription';
import LinkTypeTag from './LinkTypeTag';

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
          <ul className='window-widget-links-list'>
            {this.props.window.links.map((el, i) => {
              const direction = el.type != LinkType.Push ? el.direction : (el.qualifiedDirection ? `${el.qualifiedDirection.dialog}.${el.qualifiedDirection.window}` : "?")
              return <li key={i}><LinkTypeTag value={el.type}/><span className='window-widget-link-direction-text'>{direction}</span></li>
            })}
          </ul>
        </div>
      </div>
    </Col>
  }
}

