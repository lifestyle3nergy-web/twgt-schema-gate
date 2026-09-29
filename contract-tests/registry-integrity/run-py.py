#!/usr/bin/env python3
import json, os, sys
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
REG  = os.path.join(REPO, "schemas", "registry.json")
out = {"ok": False, "registry": REG, "count": 0, "entries": [], "problems": []}
if not os.path.exists(REG):
    out["problems"].append("registry.json missing")
else:
    try:
        with open(REG) as f: reg = json.load(f)
        lst = reg if isinstance(reg, list) else reg.get("schemas", reg.get("entries", []))
        out["count"] = len(lst); ids = set()
        for e in lst:
            f_  = e if isinstance(e, str) else (e.get("path") or e.get("file") or e.get("$ref") or "")
            id_ = "" if isinstance(e, str) else (e.get("$id") or e.get("id") or "")
            abs_ = os.path.join(REPO, "schemas", f_.replace("schemas/", ""))
            present = os.path.exists(abs_) or os.path.exists(os.path.join(REPO, f_))
            if id_:
                if id_ in ids: out["problems"].append(f"dup $id: {id_}")
                ids.add(id_)
            if not present: out["problems"].append(f"missing: {f_}")
            out["entries"].append({"file": f_, "id": id_, "present": present})
    except Exception as ex:
        out["problems"].append("parse: " + str(ex))
out["ok"] = len(out["problems"]) == 0
print(json.dumps(out, indent=2))
sys.exit(0 if out["ok"] else 1)
