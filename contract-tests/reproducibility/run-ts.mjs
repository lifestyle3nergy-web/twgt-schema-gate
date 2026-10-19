// G-02 reproducibility gate — static scan for non-deterministic sources.
//
// Test output that varies between runs makes "green on the exact head"
// unverifiable because the same commit can pass and fail. This gate fails
// closed if any source of non-determinism appears in contract-tests/.
//
// Patterns are sourced from vendor documentation, not invented:
//   Date.now, new Date(), Math.random:  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now
//   crypto.randomUUID:                  https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID
//   random.*, uuid.*, datetime.now:     https://docs.python.org/3/library/random.html#notes-on-reproducibility
//
// Known limitation (not enforced): generate-fixtures.mjs iterates readdirSync
// without .sort(). Stable on ext4 / APFS; may vary on other filesystems.
// Detection requires AST-level analysis — outside this gate's scope.
//
// Self-allowlist: this file and run-py.py contain the pattern strings inside
// their regex definitions. Standard limitation of self-verifying gates.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "../..");
const SCAN_ROOT = join(REPO, "contract-tests");
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "fixtures"]);
const EXT_ALLOW = /\.(mjs|py)$/;
const MAX_BYTES = 512 * 1024;

const PATTERNS = [
  { kind: "date-now",          re: /\bDate\.now\b/ },
  { kind: "new-date-empty",    re: /\bnew\s+Date\s*\(\s*\)/ },
  { kind: "math-random",       re: /\bMath\.random\s*\(/ },
  { kind: "crypto-randomUUID", re: /\bcrypto\.randomUUID\s*\(/ },
  { kind: "py-random-random",  re: /\brandom\.random\s*\(/ },
  { kind: "py-random-randint", re: /\brandom\.randint\s*\(/ },
  { kind: "py-random-choice",  re: /\brandom\.choice\s*\(/ },
  { kind: "py-random-shuffle", re: /\brandom\.shuffle\s*\(/ },
  { kind: "py-uuid-uuid4",     re: /\buuid\.uuid4\s*\(/ },
  { kind: "py-uuid-uuid1",     re: /\buuid\.uuid1\s*\(/ },
  { kind: "py-datetime-now",   re: /\bdatetime\.(?:now|utcnow)\s*\(/ },
];

const ALLOWLIST = [
  { file: "contract-tests/reproducibility/run-ts.mjs", reason: "regex source contains pattern strings" },
  { file: "contract-tests/reproducibility/run-py.py", reason: "regex source contains pattern strings" },
];

const out = { ok: false, gate: "G-02", root: REPO, scanned: 0, hits: [], problems: [], notes: [] };

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
        const allowed = ALLOWLIST.some(a => a.file === rel);
        if (allowed) continue;
        out.hits.push({ file: rel, line: i + 1, kind: p.kind, text: lines[i].trim().slice(0, 120) });
      }
    }
  }
}

walk(SCAN_ROOT);
out.ok = out.problems.length === 0 && out.hits.length === 0;
console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);
