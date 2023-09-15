
export interface NumberProp {
    name: string
    datatype: "number"
    max?: number
    min?: number
    defaultValue: number
}

export interface BoolProp {
    datatype: "boolean"
    name: string
    defaultValue: boolean
}

export interface StringProp {
    datatype: "string"
    name: string
    defaultValue: string
}

export interface VariantProp {
    datatype: "string"
    name: string
    defaultValue: string
    variants: string[]
}


type Prop = NumberProp | BoolProp | StringProp

export default Prop