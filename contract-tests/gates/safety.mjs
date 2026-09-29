import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const roots = ["schemas/v1", "schemas/v1/common"];
const failures = [];

for (const root of roots) {
  if (!existsSync(root)) continue;
  for (const file of readdirSync(root).filter(f => f.endsWith(".json"))) {
    const path = join(root, file);
    const schema = JSON.parse(readFileSync(path, "utf8"));
    if (!schema.$id) failures.push(`${path}: missing $id`);
    if (!schema.$schema) failures.push(`${path}: missing $schema`);
    const text = readFileSync(path, "utf8");
    if (text.includes('"$ref": "http') || text.includes('"$ref":"http')) failures.push(`${path}: remote $ref forbidden`);
  }
}
console.log(JSON.stringify({ failures }, null, 2));
process.exit(failures.length === 0 ? 0 : 1);
