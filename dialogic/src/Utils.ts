import lodash, { lowerFirst, upperFirst } from "lodash";

export function isValidIdentifier(str: string): boolean {
    return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str);
}

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

export { allEnumValuesOf, asColor, removeByIndex };

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

export function createTypeAssertionFunction<T>(properties: (keyof T)[]): (obj: any) => obj is T {
    return function (obj: any): obj is T {
        return properties.every(prop => prop in obj);
    };
}

// type TypeAssertion<T> = {
//     [K in keyof T]: (value: any) => value is T[K];
// };

// export function createSampleTypeAssertionFunction<T extends object>(sample: T): (obj: any) => obj is T {
//     const assertions: TypeAssertion<T> = {} as TypeAssertion<T>;

//     for (const key in sample) {
//         if (sample.hasOwnProperty(key)) {
//             assertions[key] = (value): value is T[typeof key] => typeof value === typeof sample[key];
//         }
//     }

//     return function (obj: any): obj is T {
//         if (lodash.isObject(obj)) {
//             return Object.keys(assertions).every((key) => {
//                 const ass = assertions[key]
//                 return ass(obj[key])
//             })
//         } else {
//             return false
//         }
//     };
// }

export function generateUidFromName(name: string) {
    const words = name.split(' ').map(word => upperFirst(word))
    const gluedWords = words.join('')
    return lowerFirst(gluedWords)
}

type GroupedData<T> = { [key: string]: T[] };

export function groupByProperty<T>(array: T[], property: keyof T): GroupedData<T> {
    return array.reduce((result, obj) => {
        const key = String(obj[property]);
        result[key] = result[key] || [];
        result[key].push(obj);
        return result;
    }, {} as GroupedData<T>);
}

export function trimArray<T>(arr: T[], maxLength: number): T[] {
    if (arr.length > maxLength) {
        return arr.slice(0, maxLength);
    }
    return arr;
}

export class LocalStorage {
    static set(key: string, value: any): void {
        try {
            const serializedValue = JSON.stringify(value);
            localStorage.setItem(key, serializedValue);
        } catch (error) {
            console.error("Error storing to local storage:", error);
        }
    }

    static get<T>(key: string): T | null {
        try {
            const serializedValue = localStorage.getItem(key);
            if (serializedValue === null) {
                return null;
            }
            return JSON.parse(serializedValue) as T;
        } catch (error) {
            console.error("Error retrieving from local storage:", error);
            return null;
        }
    }

    static removeItem(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error("Error removing from local storage:", error);
        }
    }

    static has(key: string): boolean {
        try {
            return localStorage.getItem(key) !== null;
        } catch (error) {
            console.error("Error checking local storage item:", error);
            return false;
        }
    }

    static clear(): void {
        try {
            localStorage.clear();
        } catch (error) {
            console.error("Error clearing local storage:", error);
        }
    }
}