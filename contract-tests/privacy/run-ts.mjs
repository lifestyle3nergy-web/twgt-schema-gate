import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "../..");
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next"]);
const EXT_ALLOW = /\.(js|mjs|cjs|ts|tsx|py|md|ya?ml|json|txt|sh)$/;
const MAX_BYTES = 512 * 1024;
const PATTERNS = [
  { kind: "email", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/ },
  { kind: "ssn",   re: /\b\d{3}-\d{2}-\d{4}\b/ },
  { kind: "e164",  re: /\+[1-9]\d{7,14}\b/ },
];
const ALLOWLIST = [];

const out = { ok: false, gate: "SG-05", root: REPO, scanned: 0, hits: [], problems: [] };

function walk(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); }
  catch (e) { out.problems.push(`readdir ${relative(REPO, dir)}: ${e.message}`); return; }
  for (const ent of entries) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const abs = join(dir, ent.name);
    const rel = relative(REPO, abs).replace(/\\/g, "/");
    if (ent.isSymbolicLink()) continue;
    if (ent.isDirectory()) { walk(abs); continue; }
    if (!ent.isFile()) continue;
    if (!EXT_ALLOW.test(ent.name)) continue;
    let st;
    try { st = statSync(abs); }
    catch (e) { out.problems.push(`stat ${rel}: ${e.message}`); continue; }
    if (st.size > MAX_BYTES) continue;
    out.scanned++;
    let text;
    try { text = readFileSync(abs, "utf8"); }
    catch (e) { out.problems.push(`read ${rel}: ${e.message}`); continue; }
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      for (const p of PATTERNS) {
        if (!p.re.test(lines[i])) continue;
        const allowed = ALLOWLIST.some(a =>
          a.file === rel && (a.line === null || a.line === i + 1));
        if (allowed) continue;
        out.hits.push({ file: rel, line: i + 1, kind: p.kind, text: lines[i].slice(0, 120) });
      }
    }
  }
}

walk(REPO);
out.ok = out.problems.length === 0 && out.hits.length === 0;
console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);
