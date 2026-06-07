import lodash from "lodash";
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';
import { GameDescription, createDefaultConfig } from "./GameDescription";
import { createTranslations } from "../exec/Localization";
import { initGameUiElementDescr } from "./GameUiElementDescr";

export default interface Patch {
    from(): string;
    to(): string;
    apply(obj: unknown): GameDescription
}

export class PatchFrom04To05 implements Patch {
    from(): string {
        return "0.4"
    }
    to(): string {
        return "0.5"
    }
    apply(obj: unknown): GameDescription {
        // do the patch work
        console.log("Patching 0.4 to 0.5")
        const data = obj as Record<string, unknown>
        data["config"] = createDefaultConfig()
        return data as unknown as GameDescription
    }
}

export class PatchFrom05To06 implements Patch {
    from(): string {
        return "0.5"
    }
    to(): string {
        return "0.6"
    }
    apply(obj: unknown): GameDescription {
        // do the patch work
        console.log("Patching 0.5 to 0.6")
        const data = obj as Record<string, unknown>
        data["objectives"] = []
        return data as unknown as GameDescription
    }
}

export class PatchFrom06To07 implements Patch {
    from(): string {
        return "0.6"
    }
    to(): string {
        return "0.7"
    }
    apply(obj: unknown): GameDescription {
        // do the patch work
        console.log(`Patching ${this.from()} to ${this.to()}`)
        const data = obj as Record<string, unknown>
        data["translations"] = createTranslations()
        return data as unknown as GameDescription
    }
}

export class PatchFrom07To08 implements Patch {
    from(): string {
        return "0.7"
    }
    to(): string {
        return "0.8"
    }
    apply(obj: unknown): GameDescription {
        // do the patch work
        console.log(`Patching ${this.from()} to ${this.to()}`)
        const data = obj as Record<string, unknown>
        data["situations"] = []
        return data as unknown as GameDescription
    }
}

export class PatchFrom08To09 implements Patch {
    from(): string {
        return "0.8"
    }
    to(): string {
        return "0.9"
    }
    apply(obj: unknown): GameDescription {
        // do the patch work
        console.log(`Patching ${this.from()} to ${this.to()}`)
        const objData = obj as GameDescription
        for (const loc of objData.locs) {
            loc["discussable"] = true
        }
        for (const char of objData.chars) {
            char["discussable"] = true
        }
        for (const fact of objData.facts) {
            fact["discussable"] = true
        }

        return objData
    }
}

export class PatchFrom09To010 implements Patch {
    from(): string {
        return "0.9"
    }
    to(): string {
        return "0.10"
    }
    apply(obj: unknown): GameDescription {
        // do the patch work
        console.log(`Patching ${this.from()} to ${this.to()}`)
        const objData = obj as GameDescription
        for (const char of objData.items) {
            char["stackable"] = false
        }
        objData.uiElements = initGameUiElementDescr()
        return objData
    }
}

export class PatchFrom10To011 implements Patch {
    from(): string {
        return "0.10"
    }
    to(): string {
        return "0.11"
    }
    apply(obj: unknown): GameDescription {
        // do the patch work
        console.log(`Patching ${this.from()} to ${this.to()}`)
        const objData = obj as GameDescription
        if (!objData.pacWidgets) {
            objData.pacWidgets = []
        }
        return objData
    }
}

const PATCHES = [
    new PatchFrom04To05(),
    new PatchFrom05To06(),
    new PatchFrom06To07(),
    new PatchFrom07To08(),
    new PatchFrom08To09(),
    new PatchFrom09To010(),
    new PatchFrom10To011(),
]

export function loadJsonStringAndPatch(json: string, currentEngine: string) {
    const parsed: unknown = JSON.parse(json)
    // at least we can parse it
    const version = (parsed as Record<string, unknown>)["engineVersion"]
    if (version === undefined || version === null || !lodash.isString(version)) {
        throw Error("Cannot read property 'engineVersion' of json data, this is not a game")
    }
    const result: GameDescription = version === currentEngine
        ? parsed as GameDescription
        : patchGame(parsed as GameDescription, version, currentEngine);

    if (!result.general?.name) {
        result.general = { ...result.general, name: uniqueNamesGenerator({ dictionaries: [adjectives, animals], separator: '-', length: 2 }) };
    }

    return result;
}

function patchGame(parsed: GameDescription, version: string, currentEngine: string): GameDescription {
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
