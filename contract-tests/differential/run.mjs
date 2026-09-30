#!/usr/bin/env node
// M3 differential: compare two executions, report every divergence
// by JSON path. Fail-closed. Any difference that survives normalization
// returns HELD with the exact path.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { normalize } from "./normalize.mjs";

export function diffPaths(a, b, path = "$", out = []) {
  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return out;

  const ta = Array.isArray(na) ? "array" : na === null ? "null" : typeof na;
  const tb = Array.isArray(nb) ? "array" : nb === null ? "null" : typeof nb;

  if (ta !== tb) {
    out.push({ path, kind: "TYPE", expected: ta, actual: tb });
    return out;
  }

  if (ta === "object") {
    const keys = new Set([...Object.keys(na), ...Object.keys(nb)]);
    for (const k of [...keys].sort()) {
      const hasA = k in na;
      const hasB = k in nb;
      if (!hasA) {
        out.push({ path: `${path}.${k}`, kind: "EXTRA", expected: null, actual: nb[k] });
      } else if (!hasB) {
        out.push({ path: `${path}.${k}`, kind: "MISSING", expected: na[k], actual: null });
      } else {
        diffPaths(na[k], nb[k], `${path}.${k}`, out);
      }
    }
    return out;
  }

  if (ta === "array") {
    if (na.length !== nb.length) {
      out.push({ path, kind: "LENGTH", expected: na.length, actual: nb.length });
    }
    const len = Math.min(na.length, nb.length);
    for (let i = 0; i < len; i++) diffPaths(na[i], nb[i], `${path}[${i}]`, out);
    return out;
  }

  out.push({ path, kind: "VALUE", expected: na, actual: nb });
  return out;
}

export function decide(baseline, candidate) {
  const divergences = diffPaths(baseline, candidate);
  if (divergences.length === 0) {
    return { state: "ADMITTED", reason: "IDENTICAL", divergences: [] };
  }
  return {
    state: "HELD",
    reason: "DIVERGENCE",
    count: divergences.length,
    divergences,
  };
}

// CLI: node run.mjs <baseline.json> <candidate.json>
if (import.meta.url === `file://${process.argv[1]}`) {
  const [a, b] = process.argv.slice(2);
  if (!a || !b) {
    console.error("usage: node run.mjs <baseline.json> <candidate.json>");
    process.exit(2);
  }
  const pa = resolve(a);
  const pb = resolve(b);
  if (!existsSync(pa) || !existsSync(pb)) {
    console.error(`[HELD] FILE_MISSING: ${!existsSync(pa) ? pa : pb}`);
    process.exit(3);
  }
  const baseline = JSON.parse(readFileSync(pa, "utf8"));
  const candidate = JSON.parse(readFileSync(pb, "utf8"));
  const decision = decide(baseline, candidate);
  console.log(JSON.stringify(decision, null, 2));
  process.exit(decision.state === "ADMITTED" ? 0 : 1);
}
