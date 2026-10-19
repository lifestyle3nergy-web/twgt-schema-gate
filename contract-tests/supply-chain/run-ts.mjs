// SG-06 supply-chain gate — workflow trigger and script-injection detection.
//
// Patterns are sourced from GitHub's published security guidance, not invented:
//   P1, P2: https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#preventing-pwn-requests
//   P3:     https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#script-injections
//   P4:     https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_run
//
// P2 and P3 fail the gate. P1 and P4 report only — the trigger alone is
// dangerous context, not a vulnerability. Exploitation requires the paired
// pattern, which is what P2 and P3 detect.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "../..");
const WF_DIR = join(REPO, ".github/workflows");

const PR_SCRIPT_FIELDS = [
  "github.event.pull_request.title",
  "github.event.pull_request.body",
  "github.event.pull_request.head.ref",
  "github.event.pull_request.head.label",
  "github.event.issue.title",
  "github.event.issue.body",
  "github.event.comment.body",
  "github.event.review.body",
  "github.event.review_comment.body",
  "github.head_ref",
];
const PR_HEAD_FRAGMENT = "github.event.pull_request.head.";
const INTERP_RE = /\$\{\{\s*([^}]+?)\s*\}\}/g;

const out = {
  ok: false,
  gate: "SG-06",
  root: REPO,
  workflows_scanned: 0,
  findings: [],
  problems: [],
  notes: [
    "known limitation: workflow_run.head_branch not in P3 list — not in GitHub's canonical script-injection field set",
  ],
};

function hasTrigger(lines, name) {
  const keyRe = new RegExp(`^\\s*${name}\\s*:`);
  const listRe = new RegExp(`^\\s*-\\s*${name}\\s*$`);
  const inlineRe = new RegExp(`\\[.*\\b${name}\\b.*\\]`);
  for (const raw of lines) {
    const t = raw.trim();
    if (!t || t.startsWith("#")) continue;
    if (keyRe.test(raw) || listRe.test(raw) || inlineRe.test(raw)) return true;
  }
  return false;
}

function* runBlocks(lines) {
  let runIndent = -1;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const stripped = raw.trim();
    if (!stripped || stripped.startsWith("#")) continue;
    const indent = raw.length - raw.trimStart().length;

    if (runIndent >= 0 && indent <= runIndent) runIndent = -1;

    const blockStart = /^\s*run:\s*[|>]/.exec(raw);
    if (blockStart) { runIndent = indent; continue; }

    const inline = /^\s*run:\s+([^|>].*)$/.exec(raw);
    if (inline) { yield { line: i + 1, text: inline[1] }; continue; }

    if (runIndent >= 0) yield { line: i + 1, text: raw };
  }
}

if (!existsSync(WF_DIR)) out.problems.push(".github/workflows missing");
else {
  const files = readdirSync(WF_DIR).filter(f => /\.ya?ml$/.test(f)).sort();
  for (const name of files) {
    out.workflows_scanned++;
    const abs = join(WF_DIR, name);
    const rel = relative(REPO, abs).replace(/\\/g, "/");
    let text;
    try { text = readFileSync(abs, "utf8"); }
    catch (e) { out.problems.push(`read ${rel}: ${e.message}`); continue; }
    const lines = text.split("\n");

    const hasPRT = hasTrigger(lines, "pull_request_target");
    const hasWR = hasTrigger(lines, "workflow_run");
    if (hasPRT) out.findings.push({ file: rel, line: null, pattern: "P1", severity: "report", detail: "pull_request_target trigger" });
    if (hasWR) out.findings.push({ file: rel, line: null, pattern: "P4", severity: "report", detail: "workflow_run trigger" });

    if (hasPRT) {
      for (let i = 0; i < lines.length; i++) {
        if (!/^\s*(ref|repository)\s*:/.test(lines[i])) continue;
        if (lines[i].includes(PR_HEAD_FRAGMENT)) {
          out.findings.push({
            file: rel, line: i + 1, pattern: "P2", severity: "fail",
            detail: `${lines[i].trim().slice(0, 100)}`
          });
        }
      }
    }

    for (const { line, text: body } of runBlocks(lines)) {
      let m;
      INTERP_RE.lastIndex = 0;
      while ((m = INTERP_RE.exec(body)) !== null) {
        const expr = m[1];
        for (const field of PR_SCRIPT_FIELDS) {
          if (expr.includes(field)) {
            out.findings.push({
              file: rel, line, pattern: "P3", severity: "fail",
              detail: `\${{\u0020${field}\u0020}} in run:`
            });
            break;
          }
        }
      }
    }
  }
}

const hasFailure = out.findings.some(f => f.severity === "fail");
out.ok = out.problems.length === 0 && !hasFailure;
console.log(JSON.stringify(out, null, 2));
process.exit(out.ok ? 0 : 1);
