#!/usr/bin/env node
import { readFileSync,readdirSync } from "node:fs";
import { join,resolve } from "node:path";
const root=resolve(new URL(".",import.meta.url).pathname,".."), dir=join(root,".github","workflows"),problems=[];
for(const f of readdirSync(dir).filter(x=>x.endsWith(".yml")||x.endsWith(".yaml"))){const s=readFileSync(join(dir,f),"utf8");if(/permissions:\s*write/.test(s)&&!/contents:\s*write/.test(s))problems.push(f+":unexpected-write-permission");if(/curl\s+[^\n]*\|\s*(bash|sh)|wget\s+[^\n]*\|\s*(bash|sh)/.test(s))problems.push(f+":remote-script-execution");}
console.log(JSON.stringify({state:problems.length?"HELD":"VALIDATED",reason:problems.length?"WORKFLOW_SUPPLY_CHAIN_RISK":"WORKFLOW_STATIC_CHECKS_CLEAN",problems},null,2));process.exit(problems.length?1:0);
