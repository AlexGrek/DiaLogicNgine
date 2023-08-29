export interface TextListEntry {
    name?: string,
    text: string
}

export interface TextList {
    main: string,
    list: TextListEntry[]
}
