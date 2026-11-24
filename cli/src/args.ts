import { readFileSync } from "node:fs";

/** Positionals and flags, interleaved, Go-flag style: -name value, -name=value, --name. */
export interface Parsed {
  pos: string[];
  flags: Record<string, string>;
}

export class UsageError extends Error {}

/** "-dry-run" / "--dry_run" → "dry_run" */
export function normFlag(s: string): string {
  return s.replace(/^-+/, "").replace(/-/g, "_");
}

/**
 * Split args into positionals and flags. `bools` are flags that take no value
 * ("-image", or "-flag=false"); `known` (when given) rejects anything else. A lone
 * "-" is a positional (the stdin marker); "--" ends flag parsing.
 */
export function parseArgs(args: string[], bools: Set<string> = new Set(), known?: Set<string>): Parsed {
  const p: Parsed = { pos: [], flags: {} };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--") {
      p.pos.push(...args.slice(i + 1));
      break;
    }
    if (a.length < 2 || a[0] !== "-" || /^-\d/.test(a)) {
      p.pos.push(a);
      continue;
    }
    const eq = a.indexOf("=");
    const name = normFlag(eq >= 0 ? a.slice(0, eq) : a);
    const isHelp = name === "h" || name === "help";
    if (known && !known.has(name) && !isHelp) throw new UsageError(`unknown flag -${name}`);
    if (eq >= 0) p.flags[name] = a.slice(eq + 1);
    else if (bools.has(name) || isHelp) p.flags[name] = "true";
    else if (i + 1 < args.length) p.flags[name] = args[++i];
    else throw new UsageError(`flag -${name} needs a value`);
  }
  return p;
}

export function flagOn(p: Parsed, name: string): boolean {
  const v = p.flags[name];
  return v === "true" || v === "1" || v === "yes";
}

export function wantsHelp(p: Parsed): boolean {
  return "h" in p.flags || "help" in p.flags;
}

/** Inline text, "@file" or "-" (stdin). */
export function readText(v: string): string {
  if (v === "-") return readFileSync(0, "utf8");
  if (v.startsWith("@")) return readFileSync(v.slice(1), "utf8");
  return v;
}

/** One-call helper for subcommands with a fixed flag set. */
export function parseFor(args: string[], spec: { bools?: string[]; values?: string[] }): Parsed {
  const bools = new Set(spec.bools ?? []);
  const known = new Set([...(spec.bools ?? []), ...(spec.values ?? [])]);
  return parseArgs(args, bools, known);
}
