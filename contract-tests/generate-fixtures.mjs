import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const OUT  = join(__dirname, "fixtures");
mkdirSync(OUT, { recursive: true });

function matchPattern(pattern) {
  const rx = new RegExp(pattern);

  // 1. ^prefix[<chars>]{N}$   e.g. ^sha256:[0-9a-f]{64}$
  const m1 = pattern.match(/^\^([^\[\]]*)\[([^\]]+)\]\{(\d+)\}\$$/);
  if (m1) {
    const prefix = m1[1] || "";
    const chars  = m1[2];
    const n      = parseInt(m1[3], 10);
    const picks  = [];
    if (/0-9a-f/i.test(chars) || /a-f/i.test(chars)) picks.push("a", "0", "f", "deadbeef");
    if (/A-Z/.test(chars)) picks.push("A");
    if (/a-z/.test(chars)) picks.push("a", "x");
    if (/0-9/.test(chars)) picks.push("0", "1");
    if (/[A-Za-z0-9]/.test(chars)) picks.push("a", "0", "x");
    picks.push("a", "0", "x");
    for (const p of picks) {
      const built = prefix + p.repeat(n);
      if (rx.test(built)) return built;
    }
  }

  // 2. ^[<chars>]{N}$   no prefix
  const m2 = pattern.match(/^\^\[([^\]]+)\]\{(\d+)\}\$$/);
  if (m2) {
    const chars = m2[1];
    const n     = parseInt(m2[2], 10);
    for (const p of ["a", "0", "A", "f", "x"]) {
      const built = p.repeat(n);
      if (rx.test(built)) return built;
    }
  }

  // 3. Known candidate pool
  const candidates = [
    "a", "0", "1", "abc", "x", "sample",
    "a".repeat(8), "a".repeat(16), "a".repeat(32), "a".repeat(40),
    "a".repeat(64), "a".repeat(128),
    "0".repeat(8), "0".repeat(16), "0".repeat(32), "0".repeat(40),
    "0".repeat(64), "0".repeat(128),
    "A".repeat(8), "A".repeat(32), "A".repeat(64),
    "deadbeef", "deadbeef".repeat(2), "deadbeef".repeat(4), "deadbeef".repeat(8),
    "sha256:" + "a".repeat(64),
    "sha256:" + "0".repeat(64),
    "sha1:" + "a".repeat(40),
    "sha512:" + "a".repeat(128),
    "00000000-0000-0000-0000-000000000000",
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "https://example.com/x",
    "2026-01-01T00:00:00Z",
    "2026-01-01T00:00:00.000Z",
  ];
  for (const c of candidates) if (rx.test(c)) return c;

  // 4. Brute force: alphabets x lengths
  for (const alpha of ["a", "0", "A", "f"]) {
    for (const n of [1,2,4,8,16,24,32,40,48,56,64,96,128,256]) {
      const t = alpha.repeat(n);
      if (rx.test(t)) return t;
    }
  }
  return "sample";
}

// Load every local schema once so fixture generation can materialize local $ref
// dependencies instead of emitting placeholder strings such as "sample".
const schemaById = new Map();
const schemaByPath = new Map();
const schemaFiles = [];
for (const dir of ["schemas/v1", "schemas/v1/common"]) {
  const abs = join(REPO, dir);
  if (!existsSync(abs)) continue;
  for (const f of readdirSync(abs)) {
    if (!f.endsWith(".json") || f === "registry.json") continue;
    const path = join(abs, f);
    const schema = JSON.parse(readFileSync(path, "utf8"));
    schemaFiles.push({ path, schema });
    if (schema.$id) schemaById.set(schema.$id, schema);
    schemaByPath.set(resolve(path), schema);
  }
}

function resolveLocalRef(ref, baseId, basePath) {
  if (ref.startsWith("#")) return null; // local fragment refs are handled by validators.
  try {
    const resolvedId = new URL(ref, baseId || "https://local.invalid/").href;
    if (schemaById.has(resolvedId)) return schemaById.get(resolvedId);
  } catch {}
  try {
    const resolvedPath = resolve(dirname(basePath), ref);
    if (schemaByPath.has(resolvedPath)) return schemaByPath.get(resolvedPath);
  } catch {}
  return null;
}

function stub(schema, baseId = schema.$id, basePath = "") {
  if (schema.$ref) {
    const target = resolveLocalRef(schema.$ref, baseId, basePath);
    if (!target) throw new Error(`unresolved local fixture $ref: ${schema.$ref}`);
    return stub(target, target.$id || baseId, basePath);
  }
  if (schema.const !== undefined) return schema.const;
  if (schema.enum) return schema.enum[0];
  const t = schema.type || (schema.properties ? "object" : "string");
  switch (t) {
    case "object": {
      const o = {}; const props = schema.properties || {};
      const keys = schema.required || Object.keys(props);
      for (const k of keys) o[k] = props[k] ? stub(props[k], baseId, basePath) : null;
      return o;
    }
    case "array":   return schema.items ? [stub(schema.items, baseId, basePath)] : [];
    case "string": {
      if (schema.pattern) return matchPattern(schema.pattern);
      if (schema.format === "date-time") return "2026-01-01T00:00:00Z";
      if (schema.format === "uri")       return "https://example.com/x";
      if (schema.minLength)              return "x".repeat(schema.minLength);
      return "sample";
    }
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
for (const { path, schema: s } of schemaFiles) {
  const name = basename(path, ".json");
  const good = stub(s, s.$id, path);
  writeFileSync(join(OUT, `${name}-valid.json`),   JSON.stringify(good, null, 2));
  writeFileSync(join(OUT, `${name}-invalid.json`), JSON.stringify(invalidate(s, good), null, 2));
  made += 2;
  console.log(`  ${name}-{valid,invalid}.json`);
}
console.log(`generated ${made} fixture(s)`);
