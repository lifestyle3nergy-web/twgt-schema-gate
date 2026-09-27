import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "../..");
const REG  = join(REPO, "schemas/registry.json");
const out = { ok: false, registry: REG, count: 0, entries: [], problems: [] };
if (!existsSync(REG)) out.problems.push("registry.json missing");
else {
  try {
    const reg = JSON.parse(readFileSync(REG, "utf8"));
    const list = Array.isArray(reg) ? reg : (reg.schemas || reg.entries || []);
    out.count = list.length;
    const ids = new Set();
    for (const e of list) {
      const file = typeof e === "string" ? e : (e.path || e.file || e.$ref || "");
      const id   = typeof e === "string" ? e : (e.$id  || e.id   || "");
      const abs  = join(REPO, "schemas", file.replace(/^schemas\//, ""));
      const present = existsSync(abs) || existsSync(join(REPO, file));
      if (id) { if (ids.has(id)) out.problems.push(`dup $id: ${id}`); ids.add(id); }
      if (!present) out.problems.push(`missing: ${file}`);
      out.entries.push({ file, id, present });
    }
  } catch (e) { out.problems.push("parse: " + e.message); }
}
out.ok = out.problems.length === 0;
console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);
