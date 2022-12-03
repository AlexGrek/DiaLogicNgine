export default interface Dialog {
    name: string;
    windows: DialogWindow[];
}

export class SimpleTextGenerator {
    text = "";

    constructor(text: string) {
        this.text = text;
    }
}

export class DialogWindow {
    public text: SimpleTextGenerator;
    uid: string;

    constructor(uid: string, text: string) {
        this.text = new SimpleTextGenerator(text);
        this.uid = uid;
    }

    public renamed(newName: string) {
        return new DialogWindow(newName, this.text.text)
    }
}
