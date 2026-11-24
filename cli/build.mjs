// Builds dist/dialogic.mjs: one executable file with the engine sandbox, the
// Deno runner and the game schema embedded. Run with `npm run build`.
import { build } from "esbuild";
import { chmodSync, readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const common = { bundle: true, write: false, target: "es2022", logLevel: "warning", define: { "process.env.NODE_ENV": '"production"' } };

// 1. The engine for the in-process vm sandbox (no Node APIs, plain script).
const sandbox = await build({ ...common, entryPoints: ["src/engine/sandbox-entry.ts"], format: "iife", platform: "neutral", mainFields: ["module", "main"] });
// 2. The Player MCP runner, for `-deno`.
const runner = await build({ ...common, entryPoints: ["../player-runner/src/main.ts"], format: "esm", platform: "browser" });

// 3. The CLI itself.
await build({
  ...common,
  write: true,
  entryPoints: ["src/cli.ts"],
  outfile: "dist/dialogic.mjs",
  format: "esm",
  platform: "node",
  target: "node22",
  banner: { js: "#!/usr/bin/env node\nimport { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  define: {
    ...common.define,
    __SANDBOX_SOURCE__: JSON.stringify(sandbox.outputFiles[0].text),
    __DENO_RUNNER_SOURCE__: JSON.stringify(runner.outputFiles[0].text),
    __CLI_VERSION__: JSON.stringify(pkg.version),
  },
});
chmodSync("dist/dialogic.mjs", 0o755);
console.log("built dist/dialogic.mjs");
