# SG-06 supply-chain gate — workflow trigger and script-injection detection.
#
# Patterns are sourced from GitHub's published security guidance, not invented:
#   P1, P2: https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#preventing-pwn-requests
#   P3:     https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#script-injections
#   P4:     https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_run
#
# P2 and P3 fail the gate. P1 and P4 report only.

import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
WF_DIR = os.path.join(REPO, ".github", "workflows")

PR_SCRIPT_FIELDS = [
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
]
PR_HEAD_FRAGMENT = "github.event.pull_request.head."
INTERP_RE = re.compile(r"\$\{\{\s*([^}]+?)\s*\}\}")

out = {
    "ok": False,
    "gate": "SG-06",
    "root": REPO,
    "workflows_scanned": 0,
    "findings": [],
    "problems": [],
    "notes": [
        "known limitation: workflow_run.head_branch not in P3 list — not in GitHub's canonical script-injection field set",
    ],
}

def has_trigger(lines, name):
    key_re = re.compile(r"^\s*" + re.escape(name) + r"\s*:")
    list_re = re.compile(r"^\s*-\s*" + re.escape(name) + r"\s*$")
    inline_re = re.compile(r"\[.*\b" + re.escape(name) + r"\b.*\]")
    for raw in lines:
        t = raw.strip()
        if not t or t.startswith("#"):
            continue
        if key_re.search(raw) or list_re.search(raw) or inline_re.search(raw):
            return True
    return False

def run_blocks(lines):
    run_indent = -1
    for i, raw in enumerate(lines):
        stripped = raw.strip()
        if not stripped or stripped.startswith("#"):
            continue
        indent = len(raw) - len(raw.lstrip())
        if run_indent >= 0 and indent <= run_indent:
            run_indent = -1
        block_start = re.match(r"^\s*run:\s*[|>]", raw)
        if block_start:
            run_indent = indent
            continue
        inline = re.match(r"^\s*run:\s+([^|>].*)$", raw)
        if inline:
            yield (i + 1, inline.group(1))
            continue
        if run_indent >= 0:
            yield (i + 1, raw)

if not os.path.isdir(WF_DIR):
    out["problems"].append(".github/workflows missing")
else:
    files = sorted(f for f in os.listdir(WF_DIR) if re.search(r"\.ya?ml$", f))
    for name in files:
        out["workflows_scanned"] += 1
        abs_p = os.path.join(WF_DIR, name)
        rel = os.path.relpath(abs_p, REPO).replace(os.sep, "/")
        try:
            with open(abs_p, "r", encoding="utf-8") as f:
                lines = f.read().split("\n")
        except Exception as e:
            out["problems"].append(f"read {rel}: {e}")
            continue

        has_prt = has_trigger(lines, "pull_request_target")
        has_wr  = has_trigger(lines, "workflow_run")
        if has_prt:
            out["findings"].append({"file": rel, "line": None, "pattern": "P1", "severity": "report", "detail": "pull_request_target trigger"})
        if has_wr:
            out["findings"].append({"file": rel, "line": None, "pattern": "P4", "severity": "report", "detail": "workflow_run trigger"})

        if has_prt:
            for i, raw in enumerate(lines):
                if not re.match(r"^\s*(ref|repository)\s*:", raw):
                    continue
                if PR_HEAD_FRAGMENT in raw:
                    out["findings"].append({
                        "file": rel, "line": i + 1, "pattern": "P2", "severity": "fail",
                        "detail": raw.strip()[:100],
                    })

        for line, body in run_blocks(lines):
            for m in INTERP_RE.finditer(body):
                expr = m.group(1)
                matched = False
                for field in PR_SCRIPT_FIELDS:
                    if field in expr:
                        out["findings"].append({
                            "file": rel, "line": line, "pattern": "P3", "severity": "fail",
                            "detail": "${{\u0020" + field + "\u0020}} in run:",
                        })
                        matched = True
                        break
                if matched:
                    break

has_failure = any(f["severity"] == "fail" for f in out["findings"])
out["ok"] = not out["problems"] and not has_failure
print(json.dumps(out, indent=2))
sys.exit(0 if out["ok"] else 1)
