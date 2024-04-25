import lodash from "lodash"

export interface TextListEntry {
    name?: string,
    text: string
}

export interface TextList {
    main: string,
    list: TextListEntry[]
}

export function emptyTextList(): TextList {
    return {main: "", list: []}
}

export function chooseText(list: TextList, i: any): string {
    // Valid values:
    // null | undefined | -1 - to pick main text
    // integer from 0 to list.length-1 - to pick alt text by index
    // non-empty string - to pick text by it's name property if it is defined
    // any other value will cause text with '! ERROR:' come instead 
    if (lodash.isUndefined(i) || lodash.isNull(i)) {
        return list.main
    }
    if (lodash.isNumber(i) && i >= 0) {
        if (i < list.list.length)
            return list.list[i].text
        else {
            return `! ERROR: cannot find text with index <${i}>`
        }
    }
    if (i === -1) {
        return list.main
    }
    if (lodash.isString(i)) {
        const found = list.list.find((el) => el.name === i)
        if (found) {
            return found.text
        } else {
            return `! ERROR: cannot find text with id <${i}>`
        }
    }
    return `! ERROR: cannot find text identified by <${i}>`
}
