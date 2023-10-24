const isValidIdentifier = require('is-valid-identifier')

function allEnumValuesOf(type: any) {
    return Object.keys(type).filter((item) => {
        return isNaN(Number(item));
    });
}

export interface KeyValuePair<K, V> {
    key: K;
    value: V;
}

export function stringEnumEntries<T extends Object>(type: T) {
    const arr = Object.keys(type).map((name) => {
        return {
            name,
            value: type[name as keyof typeof type],
        };
    });
    return arr
}

export type Color = 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'blue' | 'violet';

function asColor(color: Color): Color {
    return color;
}

function removeByIndex<T>(array: T[], index: Number) {
    return array.filter((_, i) => i !== index);
}

export { allEnumValuesOf, asColor, removeByIndex }

export function isValidJsIdentifier(id?: string) {
    if (!id) {
        return false;
    }
    return isValidIdentifier(id)
}

export function generateImageUrl(uri: string) {
    return `game_assets/${uri}`
}

export function mergeDicts<T>(dict1: T, dict2: T): T {
    return { ...dict1, ...dict2 };
}

export function isNumeric(str: string) {
    if (typeof str != "string") return false // we only process strings!  
    return !isNaN(parseInt(str)) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
        !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

export function genRandomAlphanumericString(length: number) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

export function prependToCode(prependValue: string, oldCode?: string | null) {
    if (oldCode === undefined || oldCode === null || oldCode === '') {
        return prependValue
    } else {
        return `// generated\n${prependValue}\n\n// restored\n${oldCode}`
    }
}
