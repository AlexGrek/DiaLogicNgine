export interface Position {
    dialog: string
    window: string
}

export interface State {
    position: Position
    positionStack: Position[]
    props: { [key: string]: number | string }
}