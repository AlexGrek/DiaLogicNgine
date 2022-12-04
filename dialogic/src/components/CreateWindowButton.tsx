import * as React from 'react';
import PlusRound from '@rsuite/icons/PlusRound';
import { Input, InputGroup } from 'rsuite';
import { createWindow, DialogWindow } from '../game/Dialog';

export interface ICreateWindowButtonProps {
    createHandler: (w: DialogWindow) => void;
}

export interface ICreateWindowButtonState {
    uid: string;
}

export default class CreateWindowButton extends React.Component<ICreateWindowButtonProps, ICreateWindowButtonState> {
    public constructor(props: ICreateWindowButtonProps) {
        super(props)

        this.state = { uid: "" }
    }

    inputHandler(update: string) {
        this.setState({ uid: update });
    }

    handleAddClick(_: any) {
        let newWindow = createWindow(this.state.uid);
        this.setState({ uid: "" });
        this.props.createHandler(newWindow);
    }

    handleKeyPress(event: React.KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter') {
            if (this.state.uid.length > 0) {
                let newWindow = createWindow(this.state.uid);
                this.setState({ uid: "" });
                this.props.createHandler(newWindow);
            }
        }
    }

    public render() {
        return (
            <div>
                <InputGroup>
                    <Input placeholder="Create window"
                        value={this.state.uid}
                        onChange={this.inputHandler.bind(this)}
                        onKeyDown={this.handleKeyPress.bind(this)}
                         />
                    <InputGroup.Button disabled={this.state.uid.length === 0}
                        onClick={this.handleAddClick.bind(this)}>
                        <PlusRound />
                    </InputGroup.Button>
                </InputGroup>
            </div>
        );
    }
}
