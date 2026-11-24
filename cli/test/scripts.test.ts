import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS, Manifest, collectScripts, makePlan, setScript, sum } from "../src/scripts";
import { syntaxError } from "../src/syntax";

const SAMPLE = `{
 "engineVersion":"0.21",
 "dialogs":[{"name":"main","windows":[
   {"uid":"start","entryScript":"rt.props.a = 1 < 2;","links":[{"text":"go","actionCode":"addX(1)","isVisible":"return true"}]},
   {"uid":"dup","entryScript":"x"},{"uid":"dup","entryScript":"y"}]}],
 "functions":[{"name":"addX","args":"n","body":"rt.props.a += n"}],
 "hooks":[{"name":"Reward","hook":"FACTS::DISCOVERED::f","body":"rt.props.a = 5"}],
 "uiElements":{"meters":[{"uid":"hope","name":"Hope","value":"return rt.props.a"}]},
 "props":[{"name":"a","datatype":"number","defaultValue":0,"description":"not a script"}]
}`;

function refs() {
  const g = JSON.parse(SAMPLE);
  return { g, m: new Map(collectScripts(g).map((s) => [s.path, s])) };
}

describe("scripts as files", () => {
  it("names files readably and keeps exact pointers", () => {
    const { m } = refs();
    const want: Record<string, string> = {
      "dialogs/main/windows/start/entryScript": "/dialogs/0/windows/0/entryScript",
      "dialogs/main/windows/start/links/0/actionCode": "/dialogs/0/windows/0/links/0/actionCode",
      "dialogs/main/windows/start/links/0/isVisible": "/dialogs/0/windows/0/links/0/isVisible",
      "functions/addX/body": "/functions/0/body",
      "hooks/Reward/body": "/hooks/0/body",
      "uiElements/meters/hope/value": "/uiElements/meters/0/value",
      "dialogs/main/windows/1/entryScript": "/dialogs/0/windows/1/entryScript", // duplicate uid → index
      "dialogs/main/windows/2/entryScript": "/dialogs/0/windows/2/entryScript",
    };
    for (const [p, ptr] of Object.entries(want)) expect(m.get(p)?.pointer).toBe(ptr);
    expect(m.size).toBe(Object.keys(want).length); // hook string / defaultValue / description are not scripts
    expect(m.get("functions/addX/body")?.params).toBe("n");
  });

  it("writes scripts without HTML escaping and refuses non-script fields", () => {
    const { g, m } = refs();
    setScript(g, m.get("hooks/Reward/body")!.pointer, "if (a < b && c > d) {}");
    const s = JSON.stringify(g);
    expect(s).toContain("a < b && c > d");
    expect(s).toContain('"defaultValue":0');
    expect(() => setScript(g, "/dialogs/0/name", "x")).toThrow();
  });

  it("detects edits and remote conflicts", () => {
    const { g, m } = refs();
    const dir = mkdtempSync(join(tmpdir(), "dlg-scripts-"));
    const man: Manifest = { project: "p", files: {} };
    for (const [path, s] of m) {
      const f = `${path}.js`;
      man.files[f] = { pointer: s.pointer, sha256: sum(s.src) };
      mkdirSync(dirname(join(dir, f)), { recursive: true });
      writeFileSync(join(dir, f), s.src + "\n"); // a trailing newline from an editor is not an edit
    }
    let p = makePlan(man, dir, g, false);
    expect([p.changed.length, p.conflicts.length, p.unchanged]).toEqual([0, 0, m.size]);

    writeFileSync(join(dir, "hooks/Reward/body.js"), "rt.props.a = 6\n");
    p = makePlan(man, dir, g, false);
    expect(p.changed.map((c) => c.newSrc)).toEqual(["rt.props.a = 6"]);

    setScript(g, "/hooks/0/body", "rt.props.a = 99"); // someone else changed it remotely after our dump
    p = makePlan(man, dir, g, false);
    expect([p.conflicts.length, p.changed.length]).toEqual([1, 0]);
    expect(makePlan(man, dir, g, true).changed.length).toBe(1); // -force
  });

  it("syntax-checks with line numbers that match the file", () => {
    expect(syntaxError(DEFAULT_PARAMS, "return rt.props.a > 1;")).toBeNull();
    const err = syntaxError(DEFAULT_PARAMS, "let x = 1\nif (rt.props.a {\n}");
    expect(err).toMatch(/<script>:2/);
  });
});
