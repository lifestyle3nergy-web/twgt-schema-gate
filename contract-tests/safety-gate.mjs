#!/usr/bin/env node
import { readFileSync,readdirSync,statSync } from "node:fs";
import { join,resolve } from "node:path";
const root=resolve(new URL(".",import.meta.url).pathname,".."), dir=join(root,"schemas"), problems=[];
function walk(d){for(const name of readdirSync(d)){const p=join(d,name),s=statSync(p);if(s.isDirectory())walk(p);else if(name.endsWith(".json")&&name!=="registry.json"){let x;try{x=JSON.parse(readFileSync(p,"utf8"));}catch{problems.push("invalid-json:"+p);continue;}if(x.type==="object"&&x.additionalProperties!==false)problems.push("open-object:"+p);if(!x.$id||!x.$id.startsWith("https://"))problems.push("missing-https-id:"+p);}}}
walk(dir);console.log(JSON.stringify({state:problems.length?"HELD":"VALIDATED",reason:problems.length?"UNSAFE_SCHEMA_BOUNDARY":"SCHEMA_BOUNDARIES_CLOSED",problems},null,2));process.exit(problems.length?1:0);
