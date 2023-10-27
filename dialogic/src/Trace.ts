const yaml = require('js-yaml');

const TRACE=true

export default function logYaml(obj: any, name?: string) {
    const toDump = name ? {name: name, data: obj} : obj
    const yamltext = yaml.dump(toDump)
    console.log(yamltext)
}

export function trace(obj: any) {
    if (TRACE) {
        console.log(obj)
    }
}