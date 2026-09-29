import { execFileSync } from "node:child_process";

function run(command, args) {
  return execFileSync(command, args, { encoding: "utf8" });
}

const nodeOut = JSON.parse(run("node", ["contract-tests/run-ts.mjs"]));
const pyOut = JSON.parse(run("python3", ["contract-tests/run-py.py"]));

const nodeVerdicts = new Map(nodeOut.results.map(r => [`${r.schema}/${r.kind}`, r.result]));
const pyVerdicts = new Map(pyOut.results.map(r => [`${r.schema}/${r.kind}`, r.result]));

const keys = [...new Set([...nodeVerdicts.keys(), ...pyVerdicts.keys()])].sort();
const mismatches = keys.filter(k => nodeVerdicts.get(k) !== pyVerdicts.get(k));

console.log(JSON.stringify({ keys: keys.length, mismatches, node: nodeOut.pass, python: pyOut.pass }, null, 2));
process.exit(mismatches.length === 0 && nodeOut.fail === 0 && pyOut.fail === 0 ? 0 : 1);
