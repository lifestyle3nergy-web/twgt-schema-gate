// Deterministic normalization for differential comparison.
// Two executions that differ only in transient metadata are the same
// execution. Everything else is a divergence.
//
// Fail-closed rule: an unknown key is not transient. Only the keys
// listed here are stripped. Everything else is compared verbatim.

const TRANSIENT_KEYS = new Set([
  "timestamp", "created_at", "updated_at", "collected_at",
  "started_at", "finished_at", "duration_ms", "elapsed_ms",
  "trace_id", "span_id", "request_id",
]);

export function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value === null || typeof value !== "object") return value;
  const out = {};
  for (const key of Object.keys(value).sort()) {
    if (TRANSIENT_KEYS.has(key)) continue;
    out[key] = normalize(value[key]);
  }
  return out;
}

export function canonical(value) {
  return JSON.stringify(normalize(value));
}

export function equal(a, b) {
  return canonical(a) === canonical(b);
}

export const TRANSIENT = TRANSIENT_KEYS;
