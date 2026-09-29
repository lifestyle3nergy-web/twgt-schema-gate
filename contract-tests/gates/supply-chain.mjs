import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const failures = [];
for (const file of readdirSync(".github/workflows").filter(f => f.endsWith(".yml") || f.endsWith(".yaml"))) {
  const path = join(".github/workflows", file);
  const text = readFileSync(path, "utf8");
  if (/(curl|wget)[^\n|]*\|\s*(bash|sh)/.test(text)) failures.push(`${path}: remote script piped to shell`);
  if (/uses:\s*[^\s]+@main\b/.test(text)) failures.push(`${path}: mutable action ref @main`);
  if (/uses:\s*[^\s]+@master\b/.test(text)) failures.push(`${path}: mutable action ref @master`);
}
console.log(JSON.stringify({ failures }, null, 2));
process.exit(failures.length === 0 ? 0 : 1);
