#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
const root=resolve(new URL(".",import.meta.url).pathname,"..");
function run(){const r=spawnSync(process.execPath,["contract-tests/run-ts.mjs"],{cwd:root,encoding:"utf8"});return {code:r.status??1,out:r.stdout};}
const a=run(),b=run();if(a.code!==0||b.code!==0||a.out!==b.out){console.error(JSON.stringify({state:"HELD",reason:"NON_DETERMINISTIC_CONTRACT_TEST"},null,2));process.exit(1);}
console.log(JSON.stringify({state:"VALIDATED",reason:"CONTRACT_TEST_OUTPUT_REPRODUCIBLE"},null,2));
