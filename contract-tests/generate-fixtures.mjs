import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const OUT  = join(__dirname, "fixtures");
mkdirSync(OUT, { recursive: true });
function stub(schema) {
  if (schema.const !== undefined) return schema.const;
  if (schema.enum) return schema.enum[0];
  const t = schema.type || (schema.properties ? "object" : "string");
  switch (t) {
    case "object": {
      const o = {}; const props = schema.properties || {};
      for (const k of (schema.required || Object.keys(props).slice(0,3)))
        o[k] = props[k] ? stub(props[k]) : null;
      return o;
    }
    case "array": return schema.items ? [stub(schema.items)] : [];
    case "string": return "sample";
    case "integer": return schema.minimum ?? 0;
    case "number":  return schema.minimum ?? 0;
    case "boolean": return true;
    case "null":    return null;
    default:        return {};
  }
}
function invalidate(schema, data) {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const d = { ...data };
    const req = schema.required || Object.keys(d);
    if (req.length) { delete d[req[0]]; return d; }
    d.__bad__ = true; return d;
  }
  if (typeof data === "string") return 12345;
  if (typeof data === "number") return "not-a-number";
  if (typeof data === "boolean") return "not-a-bool";
  if (Array.isArray(data)) return "not-an-array";
  return null;
}
let made = 0;
for (const dir of ["schemas/v1", "schemas/v1/common"]) {
  const abs = join(REPO, dir);
  if (!existsSync(abs)) continue;
  for (const f of readdirSync(abs)) {
    if (!f.endsWith(".json") || f === "registry.json") continue;
    const s = JSON.parse(readFileSync(join(abs, f), "utf8"));
    const name = basename(f, ".json");
    writeFileSync(join(OUT, `${name}-valid.json`),   JSON.stringify(stub(s), null, 2));
    writeFileSync(join(OUT, `${name}-invalid.json`), JSON.stringify(invalidate(s, stub(s)), null, 2));
    made += 2;
    console.log(`  ${name}-{valid,invalid}.json`);
  }
}
console.log(`generated ${made} fixture(s)`);
