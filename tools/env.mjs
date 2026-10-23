// Reads .env for local runs of tools/*.mjs (docker compose passes each service its own variables instead). No
// dependencies. A variable already in the environment wins over the file. Values are never printed or logged.
import { readFileSync } from "node:fs";

/** `KEY=value` lines → an object. Comments and blank lines are skipped; an inline ` # comment` after an unquoted value
 *  is dropped; single or double quotes around a value are removed. */
export function parseEnv(text) {
  const out = {};
  for (const line of String(text).split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    const q = v.match(/^(['"])(.*)\1$/);
    if (q) v = q[2];
    else v = v.replace(/\s+#.*$/, "").trim();
    out[m[1]] = v;
  }
  return out;
}

/** Load `.env` (the repository's, unless a path is given) into process.env without overriding what is set. */
export function loadEnv(path = new URL("../.env", import.meta.url)) {
  let text = "";
  try { text = readFileSync(path, "utf8"); } catch { return {}; }
  const vars = parseEnv(text);
  for (const [k, v] of Object.entries(vars)) if (process.env[k] === undefined) process.env[k] = v;
  return vars;
}
