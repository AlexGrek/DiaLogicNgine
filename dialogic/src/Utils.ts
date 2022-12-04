

function allEnumValuesOf(type: any) {
    return Object.keys(type).filter((item) => {
        return isNaN(Number(item));
    });
}

export interface KeyValuePair<K, V> {
    key: K;
    value: V;
}

function allEnumPairsOf(type: any): KeyValuePair<number, string>[] {
    const values = Object.values(type).filter((item) => {
        return !isNaN(Number(item));
    });
    return values.map((el: any) => {
        const numeric = Number(el);
        return { key: numeric, value: type[numeric] };
    });
}

export type Color = 'red' | 'orange' | 'yellow' | 'green' | 'cyan' | 'blue' | 'violet';

function asColor(color: Color): Color {
    return color;
}

function removeByIndex<T>(array: T[], index: Number) {
    return array.filter((_, i) => i !== index);
}

export { allEnumValuesOf, allEnumPairsOf, asColor, removeByIndex }