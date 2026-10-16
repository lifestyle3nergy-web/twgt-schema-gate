import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { validate } from "./lib/jsonschema-mini.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..");
const schema = JSON.parse(readFileSync(join(repo, "schemas/v1/common/evidence-reason-code.json"), "utf8"));
const fixtureDir = join(here, "fixtures/reason-codes");
const fixture = (name) => JSON.parse(readFileSync(join(fixtureDir, name), "utf8"));
const codes = new Set(schema.enum);

test("reason-code enum has the original 12 codes plus three additive codes", () => {
  assert.equal(schema.enum.length, 15);
  for (const code of [
    "BASELINE_ABSENT", "BASELINE_PRESENT", "EVIDENCE_BAD_TIMESTAMP",
    "EVIDENCE_MISSING_TIMESTAMP", "EVIDENCE_MISSING_VERSION", "FRESH",
    "NO_API_ERROR", "SCHEMA_VERSION_OK", "UNSUPPORTED_SCHEMA_VERSION",
    "ALL_CHECKS_PASSED", "API_ERROR", "STALE_EVIDENCE"
  ]) assert.ok(codes.has(code), `existing code removed: ${code}`);
  for (const code of [
    "BASELINE_INVALID", "BASELINE_MISMATCH", "BASELINE_INTEGRITY_FAILURE"
  ]) assert.ok(codes.has(code), `new code missing: ${code}`);
});

test("all three baseline-provenance codes validate", () => {
  for (const name of [
    "positive-baseline-invalid.json",
    "positive-baseline-mismatch.json",
    "positive-baseline-integrity-failure.json"
  ]) assert.deepEqual(validate(schema, fixture(name)), [], name);
});

test("unknown and empty reason codes fail closed", () => {
  for (const name of [
    "negative-unknown-reason-code.json",
    "negative-empty-reason-code.json"
  ]) assert.ok(validate(schema, fixture(name)).length > 0, name);
});
