#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
const root = resolve(new URL(".", import.meta.url).pathname, "..");
function run(cmd,args){const r=spawnSync(cmd,args,{cwd:root,encoding:"utf8"});return {code:r.status??1,out:r.stdout,err:r.stderr};}
const node=run(process.execPath,["contract-tests/run-ts.mjs"]);
const py=run("python3",["contract-tests/run-py.py"]);
if(node.code!==0||py.code!==0){console.error(node.err||"",py.err||"");process.exit(1);}
const n=JSON.parse(node.out), p=JSON.parse(py.out);
const norm=x=>(x.results||[]).map(r=>[r.schema,r.kind,r.result]).sort();
const nn=norm(n), pp=norm(p);
if(JSON.stringify(nn)!==JSON.stringify(pp)){
 console.error(JSON.stringify({state:"HELD",reason:"RUNTIME_VERDICT_DIVERGENCE",node:nn,python:pp},null,2));
 process.exit(1);
}
console.log(JSON.stringify({state:"VALIDATED",reason:"NODE_PYTHON_VERDICTS_MATCH",fixtures:n.pass,schemas:n.schemas},null,2));
