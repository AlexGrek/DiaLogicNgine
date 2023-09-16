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