import * as React from 'react';
import Dialog, { DialogWindow, LinkType } from '../game/Dialog';
import { Stack, Tag } from 'rsuite';
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

  private textShortened(text: string, max: number): string {
    if (text.length > max) {
      return text.substring(0, max - 3) + "..."
    }
    else {
      return text
    }
  }

  private renderTags() {
    const tags = []
    if (this.props.window.entryScript) {
      const tag = <Tag color="green">code</Tag>
      tags.push(tag)
    }
    if (this.props.window.actor) {
      const tag = <Tag color="blue">actor</Tag>
      tags.push(tag)
    }
    if (this.props.window.backgrounds.main) {
      const tag = <Tag color="orange">bg</Tag>
      tags.push(tag)
    }
    if (this.props.window.changeLocationInBg) {
      const tag = <Tag color="cyan">loc</Tag>
      tags.push(tag)
    }
    return tags
  }

  public render() {
    return <div className="window-widget-main">
      <div className="window-widget-header">
        <Stack justifyContent='space-between'>
          <span className='window-widget-ui-text'>{this.props.window.uid}</span>
          <span className='window-widget-icons'></span>
          <WindowWidgetContextMenu game={this.props.game} dialog={this.props.dialog} handlers={this.props.handlers} window={this.props.window}></WindowWidgetContextMenu>
        </Stack>
      </div>
      <div className='window-widget-content' onClick={() => this.props.onWindowChosen()}>
        <p className='window-widget-content-text'>
          {this.textShortened(this.props.window.text.main.toString(), 84)}
        </p>
      </div>
      <div className='window-widget-footer' onClick={() => this.props.onWindowChosen()}>
        <ul className='window-widget-links-list'>
          {this.props.window.links.map((el, i) => {
            var direction = ![LinkType.Push, LinkType.Jump, LinkType.ResetJump].includes(el.mainDirection.type) ? el.mainDirection.direction : (el.mainDirection.qualifiedDirection ? `${el.mainDirection.qualifiedDirection.dialog}.${el.mainDirection.qualifiedDirection.window}` : "?")
            if (el.mainDirection.type == LinkType.QuickReply) {
              direction = `"${el.mainDirection.replyText || ""}"`
            }
            return <li key={i}><LinkTypeTag value={el.mainDirection.type} /><span className='window-widget-link-direction-text'>{direction}</span></li>
          })}
        </ul>
        <div className='window-tag-list'>{this.renderTags()}</div>
      </div>
    </div>
  }
}

