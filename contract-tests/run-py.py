#!/usr/bin/env python3
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, ".."))
FIX  = os.path.join(HERE, "fixtures")

out = {"schemas": 0, "pass": 0, "fail": 0, "note": "", "results": []}

try:
    import jsonschema
    from referencing import Registry, Resource
    from referencing.jsonschema import DRAFT7
    HAVE = True
    IMPORT_ERR = ""
except Exception as e:
    HAVE = False
    IMPORT_ERR = str(e)

if not HAVE:
    out["note"] = f"python jsonschema unavailable — validation cannot run ({IMPORT_ERR})"
    print(json.dumps(out, indent=2)); sys.exit(2)


def build_registry():
    reg = Registry()
    root = os.path.join(REPO, "schemas")
    if not os.path.isdir(root):
        return reg
    for dirpath, _, filenames in os.walk(root):
        for fn in filenames:
            if not fn.endswith(".json"):
                continue
            p = os.path.join(dirpath, fn)
            try:
                doc = json.load(open(p))
            except Exception:
                continue
            if not isinstance(doc, dict):
                continue
            resource = Resource.from_contents(doc, default_specification=DRAFT7)
            sid = doc.get("$id")
            if sid:
                reg = reg.with_resource(sid, resource)
            # Also register by repo-relative path so relative $refs resolve locally
            rel = os.path.relpath(p, REPO).replace(os.sep, "/")
            reg = reg.with_resource(rel, resource)
            rel_no_prefix = rel.replace("schemas/", "", 1)
            if rel_no_prefix != rel:
                reg = reg.with_resource(rel_no_prefix, resource)
    return reg


REGISTRY = build_registry()

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
            out["results"].append({"schema": name, "kind": kind, "result": "SKIP"})
            continue
        data = json.load(open(fx))
        try:
            jsonschema.validate(data, schema, registry=REGISTRY)
            errs = 0
        except jsonschema.ValidationError:
            errs = 1
        except Exception as e:
            out["results"].append({
                "schema": name, "kind": kind, "result": "ERROR",
                "detail": str(e)[:300]
            })
            out["fail"] += 1
            continue
        expected = (kind == "valid" and errs == 0) or (kind == "invalid" and errs > 0)
        if expected:
            out["pass"] += 1
        else:
            out["fail"] += 1
        out["results"].append({
            "schema": name, "kind": kind,
            "result": "PASS" if expected else "FAIL"
        })

print(json.dumps(out, indent=2))
sys.exit(0 if out["fail"] == 0 else 1)
