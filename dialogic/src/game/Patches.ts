import lodash from "lodash";
import { GameDescription, createDefaultConfig } from "./GameDescription";
import { createTranslations } from "../exec/Localization";

export default interface Patch {
    from(): string;
    to(): string;
    apply(obj: any): GameDescription
}

export class PatchFrom04To05 implements Patch {
    from(): string {
        return "0.4"
    }
    to(): string {
        return "0.5"
    }
    apply(obj: any): GameDescription {
        // do the patch work
        console.log("Patching 0.4 to 0.5")
        obj["config"] = createDefaultConfig()
        return obj as GameDescription
    }
}

export class PatchFrom05To06 implements Patch {
    from(): string {
        return "0.5"
    }
    to(): string {
        return "0.6"
    }
    apply(obj: any): GameDescription {
        // do the patch work
        console.log("Patching 0.5 to 0.6")
        obj["objectives"] = []
        return obj as GameDescription
    }
}

export class PatchFrom06To07 implements Patch {
    from(): string {
        return "0.6"
    }
    to(): string {
        return "0.7"
    }
    apply(obj: any): GameDescription {
        // do the patch work
        console.log(`Patching ${this.from()} to ${this.to()}`)
        obj["translations"] = createTranslations()
        return obj as GameDescription
    }
}

export class PatchFrom07To08 implements Patch {
    from(): string {
        return "0.7"
    }
    to(): string {
        return "0.8"
    }
    apply(obj: any): GameDescription {
        // do the patch work
        console.log(`Patching ${this.from()} to ${this.to()}`)
        obj["situations"] = []
        return obj as GameDescription
    }
}

const PATCHES = [
    new PatchFrom04To05(),
    new PatchFrom05To06(),
    new PatchFrom06To07(),
    new PatchFrom07To08()
]

export function loadJsonStringAndPatch(json: string, currentEngine: string) {
    const parsed: any = JSON.parse(json)
    // at least we can parse it
    const version = parsed["engineVersion"]
    if (version === undefined || version === null || !lodash.isString(version)) {
        throw Error("Cannot read property 'engineVersion' of json data, this is not a game")
    }
    if (version === currentEngine) {
        // no need to patch anything
        return parsed as GameDescription
    } else {
        return patchGame(parsed, version, currentEngine)
    }
}

function patchGame(parsed: any, version: string, currentEngine: string): GameDescription {
    const patch = PATCHES.filter(p => p.from() === version)
    if (patch.length < 1) {
        throw Error("Cannot find patch for version " + version)
    }
    let patchToApply = patch[0]
    if (patch.length > 1) {
        console.warn("Found multiple patches for version" + version)
        patch.sort((a, b) => a.to() < b.to() ? -1 : 1)
        patchToApply = patch[0] //TODO: check sort order, it was picked randomly
    }
    const patched = patchToApply.apply(parsed)
    patched.engineVersion = patchToApply.to()

    if (currentEngine === patched.engineVersion) {
        return patched
    } else {
        console.log("Running next patch")
        return patchGame(patched, patched.engineVersion, currentEngine)
    }
}
