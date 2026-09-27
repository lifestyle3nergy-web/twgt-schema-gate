import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./lib/jsonschema-mini.mjs";
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const FIX  = join(__dirname, "fixtures");
const schemas = [];
for (const dir of ["schemas/v1", "schemas/v1/common"]) {
  const abs = join(REPO, dir);
  if (!existsSync(abs)) continue;
  for (const f of readdirSync(abs)) {
    if (!f.endsWith(".json") || f === "registry.json") continue;
    schemas.push({ name: basename(f, ".json"), path: join(abs, f) });
  }
}
const results = []; let pass = 0, fail = 0;
for (const s of schemas) {
  const schema = JSON.parse(readFileSync(s.path, "utf8"));
  for (const kind of ["valid", "invalid"]) {
    const fx = join(FIX, `${s.name}-${kind}.json`);
    if (!existsSync(fx)) { results.push({ schema: s.name, kind, result: "SKIP" }); continue; }
    const errs = validate(schema, JSON.parse(readFileSync(fx, "utf8")));
    const okExpected = kind === "valid" ? errs.length === 0 : errs.length > 0;
    const verdict = okExpected ? "PASS" : "FAIL";
    if (okExpected) pass++; else fail++;
    results.push({ schema: s.name, kind, result: verdict, errorCount: errs.length });
  }
}
console.log(JSON.stringify({ schemas: schemas.length, pass, fail, results }, null, 2));
process.exit(fail === 0 ? 0 : 1);
