export default interface Dialog {
    name: string;
    windows: DialogWindow[];
}

export interface SimpleTextGenerator {
    text: string;
}

export interface DialogWindow {
    text: string;
    uid: string;
}

const renameDialogWindow = (old: DialogWindow, newName: string) => {
    return {...old, uid: newName}
}

export { renameDialogWindow };
