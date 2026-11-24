import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

/** Messages for people go to stderr, so stdout stays machine-readable. */
export function note(msg: string): void {
  process.stderr.write(msg + "\n");
}

export function printJSON(value: unknown, compact = false): void {
  process.stdout.write(JSON.stringify(value, null, compact ? undefined : 2) + "\n");
}

export function prettyJSON(s: string, raw: boolean): string {
  if (raw) return s;
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

export function writeAtomic(path: string, data: string | Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = path + ".part";
  writeFileSync(tmp, data);
  renameSync(tmp, path);
}

/** Run fn over items with a small worker pool; collect every failure. */
export async function each<T>(items: T[], fn: (item: T) => Promise<void>, workers = 4): Promise<void> {
  const errors: string[] = [];
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const item = items[next++];
      try {
        await fn(item);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(workers, items.length) }, run));
  if (errors.length) throw new Error(errors.join("\n"));
}
