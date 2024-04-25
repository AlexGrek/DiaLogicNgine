import lodash from "lodash";

import * as YAML from 'js-yaml';

const TRACE=true

export default function logYaml(obj: any, name?: string) {
    const toDump = name ? {name: name, data: obj} : obj
    const yamltext = YAML.dump(toDump)
    console.log(yamltext)
}

export function toYaml(obj: any) {
    const yamltext = YAML.dump(obj)
    return yamltext
}

export function trace(obj: any) {
    if (TRACE) {
        console.log(obj)
    }
}

export function objectFromYaml(text: string, requiredFields?: string[]) {
    const read = YAML.load(text)
    if (!lodash.isObject(read))
        throw Error("Expected object, but got not an object")
    if (requiredFields) {
        const notFound = requiredFields.filter(field => {
            if (!read.hasOwnProperty(field)) {
                return true
            }
            return false
        })
        if (notFound.length > 0) {
            throw Error(`Expected fields not found: ${notFound.join(',')}`)
        }
    }
    return read;
}
