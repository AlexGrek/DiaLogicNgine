const yaml = require('js-yaml');

export default function logYaml(obj: any, name?: string) {
    const toDump = name ? {name: name, data: obj} : obj
    const yamltext = yaml.dump(toDump)
    console.log(yamltext)
}