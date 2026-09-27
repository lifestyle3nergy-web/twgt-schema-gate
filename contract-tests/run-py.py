#!/usr/bin/env python3
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, ".."))
FIX  = os.path.join(HERE, "fixtures")
try:
    import jsonschema  # type: ignore
    HAVE = True
except Exception:
    HAVE = False
out = {"schemas": 0, "pass": 0, "fail": 0, "note": "", "results": []}
if not HAVE:
    out["note"] = "python jsonschema not installed — skipped"
    print(json.dumps(out, indent=2)); sys.exit(0)
schemas = []
for d in ("schemas/v1", "schemas/v1/common"):
    p = os.path.join(REPO, d)
    if os.path.isdir(p):
        for f in os.listdir(p):
            if f.endswith(".json") and f != "registry.json":
                schemas.append((os.path.splitext(f)[0], os.path.join(p, f)))
out["schemas"] = len(schemas)
for name, spath in schemas:
    schema = json.load(open(spath))
    for kind in ("valid", "invalid"):
        fx = os.path.join(FIX, f"{name}-{kind}.json")
        if not os.path.exists(fx):
            out["results"].append({"schema": name, "kind": kind, "result": "SKIP"}); continue
        data = json.load(open(fx))
        try:
            jsonschema.validate(data, schema); errs = 0
        except jsonschema.ValidationError: errs = 1
        expected = (kind == "valid" and errs == 0) or (kind == "invalid" and errs > 0)
        if expected: out["pass"] += 1
        else:        out["fail"] += 1
        out["results"].append({"schema": name, "kind": kind, "result": "PASS" if expected else "FAIL"})
print(json.dumps(out, indent=2))
sys.exit(0 if out["fail"] == 0 else 1)
