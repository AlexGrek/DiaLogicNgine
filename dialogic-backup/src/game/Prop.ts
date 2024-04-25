
export interface NumberProp {
    name: string
    datatype: "number"
    max?: number
    min?: number
    defaultValue: number
}

export function createNumberProp(name: string, defaultValue: number): NumberProp {
    return {
        name: name,
        datatype: "number",
        defaultValue: defaultValue
    }
}

export interface BoolProp {
    datatype: "boolean"
    name: string
    defaultValue: boolean
}

export function createBoolProp(name: string, defaultValue: boolean): BoolProp {
    return {
        datatype: "boolean",
        name: name,
        defaultValue: defaultValue
    }
}

export interface StringProp {
    datatype: "string"
    name: string
    defaultValue: string
}

export function createStringProp(name: string, defaultValue: string): StringProp {
    return {
        datatype: "string",
        name: name,
        defaultValue: defaultValue
    }
}

export interface LocProp {
    datatype: "location"
    name: string
    defaultValue: string
}

export function createLocationProp(name: string, defaultValue: string): LocProp {
    return {
        datatype: "location",
        name: name,
        defaultValue: defaultValue
    }
}

export interface VariantProp {
    datatype: "variant"
    name: string
    defaultValue: string
    variants: string[]
}

export function createVariantProp(name: string, variants: string[], defaultValue: string): VariantProp {
    if (variants.indexOf(defaultValue) < 0) {
        throw Error(`Cannot create variant property with default value ${defaultValue}: not in ${variants}`)
    }
    return {
        datatype: "variant",
        name: name,
        variants: variants,
        defaultValue: defaultValue
    }
}


type Prop = NumberProp | BoolProp | StringProp | VariantProp | LocProp

export default Prop