import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createScriptingShowcaseGame } from "../../dialogic/src/game/templates";
import { Debugger, explore, parsePosition, splitMoves } from "../src/debug";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type J = any;

function gameFile(mutate?: (g: J) => void): string {
  const g = JSON.parse(JSON.stringify(createScriptingShowcaseGame()));
  mutate?.(g);
  const f = join(mkdtempSync(join(tmpdir(), "dlg-debug-")), "game.json");
  writeFileSync(f, JSON.stringify(g));
  return f;
}

describe("move scripts", () => {
  it("splits on ; and newlines but not inside quotes", () => {
    expect(splitMoves("c; 0\n# comment\nrt rt.props.a = 'x;y'; go market")).toEqual(["c", "0", "rt rt.props.a = 'x;y'", "go market"]);
  });

  it("parses positions", () => {
    expect(parsePosition("lab/entrance")).toEqual({ kind: "window", dialog: "lab", window: "entrance" });
    expect(parsePosition("loc:market")).toEqual({ kind: "location", location: "market" });
    expect(parsePosition("char:ada")).toEqual({ kind: "chardialog", char: "ada" });
  });
});

describe("debug player", () => {
  let dbg: Debugger;
  beforeAll(async () => {
    dbg = await Debugger.open(gameFile());
  }, 30_000);
  afterAll(() => dbg?.close());

  it("starts a new game with the startup entry script applied", () => {
    expect(dbg.state.position).toMatchObject({ kind: "window", dialog: "lab", window: "entrance" });
    expect(dbg.state.visitedDialogs).toContain("lab::entrance");
  });

  it("plays, edits, asserts and undoes", async () => {
    const r = await dbg.exec("0");
    expect(r.diff?.some((d) => d.startsWith("props.gold"))).toBe(true);
    await dbg.exec("set gold 77");
    await expect(dbg.exec("expect gold=77")).resolves.toBeDefined();
    await expect(dbg.exec("expect gold=1")).rejects.toThrow(/expectation failed/);
    await dbg.exec("rt rt.items.add('battery')");
    expect(dbg.state.carriedItems.map((c) => c.item)).toContain("battery");
    await dbg.exec("undo");
    expect(dbg.state.carriedItems.map((c) => c.item)).not.toContain("battery");
  });

  it("rejects impossible moves with the MCP's messages", async () => {
    await expect(dbg.exec("c")).rejects.toThrow(/Nothing to continue/);
    await expect(dbg.exec("go nowhere")).rejects.toThrow(/only available on location screens/);
    await expect(dbg.exec("goto lab/missing")).rejects.toThrow(/No dialog window/);
  });

  it("gives scripts an empty context outside item use", async () => {
    // a plain context.usedItem read used to throw: context was undefined
    const d2 = await Debugger.open(gameFile((g) => {
      g.dialogs[0].windows[0].entryScript = "rt.props.gold = context.usedItem ? 1 : 2";
    }));
    expect(d2.state.fatalError ?? null).toBeNull();
    expect(d2.state.props.gold).toBe(2);
    d2.close();
  });

  it("stops a runaway script", async () => {
    const d3 = await Debugger.open(gameFile((g) => {
      g.dialogs[0].windows[0].links[0].actionCode = "while (true) {}";
    }), { timeoutMs: 300 });
    await expect(d3.exec("0")).rejects.toThrow(/longer than 300 ms/);
    d3.close();
  });
});

describe("explore", () => {
  it("walks the game reproducibly and reports what it reached", async () => {
    const file = gameFile();
    const a = await explore(file, { runs: 5, steps: 40, seed: 3, topics: true });
    const b = await explore(file, { runs: 5, steps: 40, seed: 3, topics: true });
    expect(a.windowsReached).toBeGreaterThan(1);
    expect(a.problems).toEqual(b.problems);
    expect(a.steps).toBe(b.steps);
  }, 60_000);
});
