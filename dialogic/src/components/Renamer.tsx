import * as React from 'react';
import { Button, Drawer, Placeholder } from 'rsuite';

export interface IRenamerProps {
    open: boolean
}

export interface IRenamerState {
    open: boolean
}

export default class Renamer extends React.Component<IRenamerProps, IRenamerState> {
  private setOpen(upd: boolean) {
    this.setState({open: upd});
  }

  public constructor(props: IRenamerProps) {
    super(props);
    this.state = {
        open: props.open
    }
  }

  public render() {
    return (
      <div>
        <Drawer placement="top" open={this.state.open} onClose={() => this.setOpen(false)}>
        <Drawer.Header>
          <Drawer.Title>Drawer Title</Drawer.Title>
          <Drawer.Actions>
            <Button onClick={() => this.setOpen(false)}>Cancel</Button>
            <Button onClick={() => this.setOpen(false)} appearance="primary">
              Confirm
            </Button>
          </Drawer.Actions>
        </Drawer.Header>
        <Drawer.Body>
          <Placeholder.Paragraph rows={8} />
        </Drawer.Body>
      </Drawer>
      </div>
    );
  }
}
