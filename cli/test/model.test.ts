import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createScriptingShowcaseGame } from "../../dialogic/src/game/templates";
import { verifyGame } from "../../dialogic/src/game/verify";
import { linkGraph, listing, renameIn, schemaOf, verifySource } from "../src/model";
import { buildIndex, parseRef } from "../src/refs";
import { openGame } from "../src/source";
import { syntaxError } from "../src/syntax";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = any;

function showcase(): J {
  return JSON.parse(JSON.stringify(createScriptingShowcaseGame()));
}

function gameFile(game: unknown): string {
  const f = join(mkdtempSync(join(tmpdir(), "dlg-model-")), "game.json");
  writeFileSync(f, JSON.stringify(game));
  return f;
}

describe("verify", () => {
  it("passes the built-in showcase with only the known PAC local-link warnings", async () => {
    const report = await verifySource(await openGame(gameFile(showcase())));
    expect(report.errors).toBe(0);
    expect(report.findings.every((f) => f.message.includes("used outside a dialog"))).toBe(true);
  });

  it("finds dangling links, undeclared facts and syntax errors", () => {
    const g = showcase();
    g.dialogs[0].windows[0].links[0].mainDirection = { type: "local", direction: "missing_window" };
    g.dialogs[0].windows[0].entryScript = "rt.facts.ghost.know(); if (x {";
    const issues = verifyGame(g, { checkSyntax: syntaxError }).filter((i) => i.severity === "error").map((i) => i.message);
    expect(issues.some((m) => m.includes('missing window "missing_window"'))).toBe(true);
    expect(issues.some((m) => m.includes("rt.facts.ghost"))).toBe(true);
    expect(issues.some((m) => m.startsWith("syntax error"))).toBe(true);
  });

  it("reports missing image files from the images/ folder", async () => {
    const g = showcase();
    g.items[0].image = "no_such.png";
    const report = await verifySource(await openGame(gameFile(g)));
    // no images/ folder next to the file → images unknown, not reported
    expect(report.imagesChecked).toBe(false);
  });
});

describe("reference index", () => {
  it("finds every reference to a fact: definition, hook and scripts", () => {
    const g = showcase();
    const fact = g.facts[0].uid;
    const refs = buildIndex(g).filter((r) => r.kind === "fact" && r.target === fact);
    expect(refs.find((r) => r.definition)).toBeDefined();
    expect(refs.some((r) => r.via === "hook")).toBe(true);
    expect(refs.some((r) => r.via === "script")).toBe(true);
  });

  it("parses user references", () => {
    const refs = buildIndex(showcase());
    expect(parseRef(refs, "char:ada")).toEqual([{ kind: "char", id: "ada" }]);
    expect(parseRef(refs, "lab/entrance")).toEqual([{ kind: "window", id: "lab/entrance" }]);
  });
});

describe("rename", () => {
  it("renames a fact everywhere and the game still verifies", () => {
    const g = showcase();
    const old = g.facts[0].uid;
    const { next, changed } = renameIn(g, "fact", old, "renamed_fact");
    expect(changed.length).toBeGreaterThan(2);
    expect(JSON.stringify(next)).not.toContain(old);
    expect(verifyGame(next).filter((i) => i.severity === "error")).toEqual([]);
  });

  it("renames a window and a quest, including paths and hooks", () => {
    let { next } = renameIn(showcase(), "window", "lab/entrance", "hall");
    expect(next.startupDialog.window).toBe("hall");
    const line = next.objectives[0].uid, quest = next.objectives[0].quests[0].uid;
    ({ next } = renameIn(next, "quest", `${line}/${quest}`, "q2"));
    expect(next.objectives[0].quests[0].path).toEqual([line, "q2"]);
    expect(next.objectives[0].quests[0].tasks.every((t: J) => t.path[1] === "q2")).toBe(true);
    expect(JSON.stringify(next)).not.toContain(`${line}.${quest}`);
    expect(verifyGame(next).filter((i) => i.severity === "error")).toEqual([]);
  });

  it("refuses clashes and non-identifier script ids", () => {
    const g = showcase();
    expect(() => renameIn(g, "fact", g.facts[0].uid, "bad-name")).toThrow(/identifier/);
    expect(() => renameIn(g, "window", "lab/entrance", "lab/vault_locked")).toThrow(/already exists/);
    expect(() => renameIn(g, "item", "nope", "x")).toThrow(/no item/);
  });
});

describe("listing, graph, schema", () => {
  it("lists windows and builds a link graph", () => {
    const g = showcase();
    expect(listing(g, "windows", "lab").length).toBe(g.dialogs.find((d: J) => d.name === "lab").windows.length);
    const edges = linkGraph(g);
    expect(edges.some((e) => e.from === "lab/entrance" && e.to === "char:ada")).toBe(true);
  });

  it("describes model types", () => {
    const loc = schemaOf("Loc") as { fields: { name: string }[] };
    expect(loc.fields.map((f) => f.name)).toContain("routes");
    expect(() => schemaOf("Prop")).toThrow(/did you mean/);
  });
});
