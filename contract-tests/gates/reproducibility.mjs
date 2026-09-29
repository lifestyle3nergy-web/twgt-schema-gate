import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";

function snapshot() {
  const files = readdirSync("contract-tests/fixtures").filter(f => f.endsWith(".json")).sort();
  return files.map(f => [f, createHash("sha256").update(readFileSync(`contract-tests/fixtures/${f}`)).digest("hex")]);
}
function run() {
  execFileSync("node", ["contract-tests/generate-fixtures.mjs"], { stdio: "ignore" });
  return snapshot();
}
const first = run();
const second = run();
const mismatch = first.filter(([name, hash], i) => second[i]?.[0] !== name || second[i]?.[1] !== hash);
console.log(JSON.stringify({ files: second.length, deterministic: mismatch.length === 0, mismatch }, null, 2));
process.exit(mismatch.length === 0 ? 0 : 1);
