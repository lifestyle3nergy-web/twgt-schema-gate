#!/usr/bin/env node
import { readFileSync,readdirSync,statSync } from "node:fs";
import { join,resolve } from "node:path";
const root=resolve(new URL(".",import.meta.url).pathname,".."), patterns=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/(?:ghp|github_pat|sk)-[A-Za-z0-9_\-]{20,}/,/AKIA[0-9A-Z]{16}/],hits=[];
function walk(d){for(const name of readdirSync(d)){if(name===".git")continue;const p=join(d,name),s=statSync(p);if(s.isDirectory())walk(p);else if(s.size<2000000){const t=readFileSync(p,"utf8");for(const re of patterns)if(re.test(t))hits.push(p);}}}
walk(root);console.log(JSON.stringify({state:hits.length?"HELD":"VALIDATED",reason:hits.length?"POTENTIAL_SECRET_LITERAL":"NO_KNOWN_SECRET_LITERAL",files:hits},null,2));process.exit(hits.length?1:0);
