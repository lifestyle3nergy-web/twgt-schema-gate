import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
SKIP_DIRS = {"node_modules", ".git", "dist", "build", ".next"}
EXT_ALLOW = re.compile(r"\.(js|mjs|cjs|ts|tsx|py|md|ya?ml|json|txt|sh)$")
MAX_BYTES = 512 * 1024
PATTERNS = [
    ("email", re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")),
    ("ssn",   re.compile(r"\b\d{3}-\d{2}-\d{4}\b")),
    ("e164",  re.compile(r"\+[1-9]\d{7,14}\b")),
]
ALLOWLIST = []

out = {"ok": False, "gate": "SG-05", "root": REPO, "scanned": 0, "hits": [], "problems": []}

def allowed(rel, line):
    for a in ALLOWLIST:
        if a["file"] == rel and (a.get("line") is None or a["line"] == line):
            return True
    return False

for root, dirs, files in os.walk(REPO):
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
                if allowed(rel, i):
                    continue
                out["hits"].append({"file": rel, "line": i, "kind": kind, "text": ln[:120]})

out["ok"] = not out["problems"] and not out["hits"]
print(json.dumps(out, indent=2))
sys.exit(0 if out["ok"] else 1)
