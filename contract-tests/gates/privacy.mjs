import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const failures = [];
const suspicious = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /gh[pousr]_[A-Za-z0-9_]{20,}/,
  /sk-[A-Za-z0-9]{20,}/
];

for (const root of ["schemas", "contract-tests/fixtures"]) {
  for (const file of readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (!file.isFile() || !file.name.endsWith(".json")) continue;
    const path = join(file.parentPath || root, file.name);
    const text = readFileSync(path, "utf8");
    for (const rx of suspicious) if (rx.test(text)) failures.push(path);
  }
}
console.log(JSON.stringify({ failures }, null, 2));
process.exit(failures.length === 0 ? 0 : 1);
