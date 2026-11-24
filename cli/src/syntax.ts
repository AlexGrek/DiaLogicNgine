import vm from "node:vm";

/**
 * Compile a game script as a function body without running it. The wrapper shares
 * line 1 with the script, so reported line numbers match the .js file. Returns the
 * error text ("<script>:LINE …") or null.
 */
export function syntaxError(params: string, src: string): string | null {
  const code = `(function(${params}){${src.replace(/\n+$/, "")}\n})`;
  try {
    new vm.Script(code, { filename: "<script>" });
    return null;
  } catch (e) {
    const err = e as Error;
    const lines = (err.stack ?? String(err)).split("\n").filter((l) => !l.startsWith("    at ") && !l.startsWith("Node.js v"));
    return lines.join("\n").trim();
  }
}
