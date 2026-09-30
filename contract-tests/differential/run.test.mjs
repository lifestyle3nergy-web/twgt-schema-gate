import { test } from "node:test";
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { normalize, canonical, equal, TRANSIENT } from "./normalize.mjs";
import { diffPaths, decide } from "./run.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = (name) => JSON.parse(readFileSync(join(HERE, "fixtures", name), "utf8"));

test("normalize strips transient keys", () => {
  const input = {
    keep: "yes",
    timestamp: "2026-01-01T00:00:00Z",
    duration_ms: 123,
    trace_id: "abc",
    nested: { keep_too: 1, started_at: "x" },
  };
  const out = normalize(input);
  assert.deepEqual(out, { keep: "yes", nested: { keep_too: 1 } });
});

test("normalize does not strip unknown keys", () => {
  const input = { unexpected: "still here" };
  const out = normalize(input);
  assert.equal(out.unexpected, "still here");
});

test("normalize sorts keys deterministically", () => {
  const a = { b: 1, a: 2 };
  const b = { a: 2, b: 1 };
  assert.equal(canonical(a), canonical(b));
  assert.equal(equal(a, b), true);
});

test("TRANSIENT set is exactly the documented keys", () => {
  assert.equal(TRANSIENT.size, 11);
  assert.ok(TRANSIENT.has("timestamp"));
  assert.ok(TRANSIENT.has("duration_ms"));
  assert.ok(TRANSIENT.has("trace_id"));
});

test("identical executions (modulo transient) ADMIT", () => {
  const b = FIX("baseline.json");
  const c = FIX("candidate-identical.json");
  const d = decide(b, c);
  assert.equal(d.state, "ADMITTED");
  assert.equal(d.reason, "IDENTICAL");
});

test("value divergence forces HELD with exact path", () => {
  const b = FIX("baseline.json");
  const c = FIX("candidate-value-diverged.json");
  const d = decide(b, c);
  assert.equal(d.state, "HELD");
  assert.equal(d.reason, "DIVERGENCE");
  const paths = d.divergences.map((x) => x.path);
  assert.ok(paths.includes("$.payload.result.count"));
});

test("missing key forces HELD", () => {
  const b = FIX("baseline.json");
  const c = FIX("candidate-missing-key.json");
  const d = decide(b, c);
  assert.equal(d.state, "HELD");
  const kinds = d.divergences.map((x) => x.kind);
  assert.ok(kinds.includes("MISSING"));
});

test("extra key forces HELD — unknown keys are never transient", () => {
  const b = FIX("baseline.json");
  const c = FIX("candidate-extra-key.json");
  const d = decide(b, c);
  assert.equal(d.state, "HELD");
  const extra = d.divergences.find((x) => x.kind === "EXTRA");
  assert.ok(extra, "expected an EXTRA divergence");
  assert.equal(extra.path, "$.unexpected_field");
});

test("type divergence is reported as TYPE, not VALUE", () => {
  const d = diffPaths({ x: 1 }, { x: "1" });
  assert.equal(d.length, 1);
  assert.equal(d[0].kind, "TYPE");
  assert.equal(d[0].path, "$.x");
});

test("array length divergence reports LENGTH plus element diffs", () => {
  const d = diffPaths({ items: [1, 2, 3] }, { items: [1, 2] });
  const kinds = d.map((x) => x.kind);
  assert.ok(kinds.includes("LENGTH"));
});

test("nested arrays: element divergence reported by index", () => {
  const d = diffPaths({ items: ["a", "b"] }, { items: ["a", "c"] });
  const paths = d.map((x) => x.path);
  assert.ok(paths.includes("$.items[1]"));
});

test("decide never returns ADMITTED when divergences exist", () => {
  const d = decide({ a: 1 }, { a: 2 });
  assert.notEqual(d.state, "ADMITTED");
  assert.equal(d.state, "HELD");
  assert.ok(d.divergences.length > 0);
});
