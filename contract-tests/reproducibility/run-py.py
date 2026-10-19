# G-02 reproducibility gate — static scan for non-deterministic sources.
#
# Test output that varies between runs makes "green on the exact head"
# unverifiable because the same commit can pass and fail. This gate fails
# closed if any source of non-determinism appears in contract-tests/.
#
# Patterns are sourced from vendor documentation, not invented:
#   Date.now, new Date(), Math.random:  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now
#   crypto.randomUUID:                  https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID
#   random.*, uuid.*, datetime.now:     https://docs.python.org/3/library/random.html#notes-on-reproducibility
#
# Known limitation (not enforced): generate-fixtures.mjs iterates readdirSync
# without .sort(). Stable on ext4 / APFS; may vary on other filesystems.
#
# Self-allowlist: this file and run-ts.mjs contain the pattern strings inside
# their regex definitions.

import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
SCAN_ROOT = os.path.join(REPO, "contract-tests")
SKIP_DIRS = {"node_modules", ".git", "dist", "build", ".next", "fixtures"}
EXT_ALLOW = re.compile(r"\.(mjs|py)$")
MAX_BYTES = 512 * 1024

PATTERNS = [
    ("date-now",          re.compile(r"\bDate\.now\b")),
    ("new-date-empty",    re.compile(r"\bnew\s+Date\s*\(\s*\)")),
    ("math-random",       re.compile(r"\bMath\.random\s*\(")),
    ("crypto-randomUUID", re.compile(r"\bcrypto\.randomUUID\s*\(")),
    ("py-random-random",  re.compile(r"\brandom\.random\s*\(")),
    ("py-random-randint", re.compile(r"\brandom\.randint\s*\(")),
    ("py-random-choice",  re.compile(r"\brandom\.choice\s*\(")),
    ("py-random-shuffle", re.compile(r"\brandom\.shuffle\s*\(")),
    ("py-uuid-uuid4",     re.compile(r"\buuid\.uuid4\s*\(")),
    ("py-uuid-uuid1",     re.compile(r"\buuid\.uuid1\s*\(")),
    ("py-datetime-now",   re.compile(r"\bdatetime\.(?:now|utcnow)\s*\(")),
]

ALLOWLIST = {
    "contract-tests/reproducibility/run-ts.mjs",
    "contract-tests/reproducibility/run-py.py",
}

out = {"ok": False, "gate": "G-02", "root": REPO, "scanned": 0, "hits": [], "problems": [], "notes": []}

for root, dirs, files in os.walk(SCAN_ROOT):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for name in files:
        if not EXT_ALLOW.search(name):
            continue
        abs_p = os.path.join(root, name)
        rel = os.path.relpath(abs_p, REPO).replace(os.sep, "/")
        if os.path.islink(abs_p):
            continue
        try:
            if os.path.getsize(abs_p) > MAX_BYTES:
                continue
        except OSError as e:
            out["problems"].append(f"stat {rel}: {e}")
            continue
        out["scanned"] += 1
        try:
            with open(abs_p, "r", encoding="utf-8") as f:
                lines = f.read().split("\n")
        except Exception as e:
            out["problems"].append(f"read {rel}: {e}")
            continue
        for i, ln in enumerate(lines, start=1):
            for kind, rx in PATTERNS:
                if not rx.search(ln):
                    continue
                if rel in ALLOWLIST:
                    continue
                out["hits"].append({"file": rel, "line": i, "kind": kind, "text": ln.strip()[:120]})

out["ok"] = not out["problems"] and not out["hits"]
print(json.dumps(out, indent=2))
sys.exit(0 if out["ok"] else 1)
