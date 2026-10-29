import { Command } from 'commander';
import fs from 'fs';
import { Validator } from './validator';
import { authorizeWithOpa } from './opa';

const program = new Command();

program
  .name('twgt-gate')
  .description('TWGT Schema and Authorization Gate')
  .argument('<file>', 'Path to relationship JSON file')
  .option('--local', 'Run only AJV validation (diagnostic only, not authoritative)')
  .option('--opa-url <url>', 'OPA server URL', process.env.TWGT_OPA_URL || 'http://localhost:8181')
  .action(async (file, options) => {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      const validator = new Validator();
      
      // 1. Structure Validation (AJV)
      const { valid, errors } = validator.validate(data);
      if (!valid) {
        console.error(JSON.stringify({ verdict: 'reject', stage: 'ajv', errors }, null, 2));
        process.exit(1);
      }

      // 2. Local short-circuit
      if (options.local) {
        console.log(JSON.stringify({ 
          verdict: 'diagnostic', 
          authoritative: false, 
          message: 'AJV passed. OPA skipped via --local flag.' 
        }, null, 2));
        return;
      }

      // 3. Authorization Validation (OPA)
      const opaResult = await authorizeWithOpa(data, options.opaUrl);
      if (!opaResult.allow) {
        console.error(JSON.stringify({ verdict: 'reject', stage: 'opa', reason: opaResult.reason }, null, 2));
        process.exit(1);
      }

      // 4. Success
      console.log(JSON.stringify({ 
        verdict: 'allow', 
        authoritative: true, 
        message: 'Passed AJV and OPA validation.' 
      }, null, 2));

    } catch (error: any) {
      if (error.message.startsWith('OPA_UNAVAILABLE')) {
        // Fail closed per spec
        console.error(JSON.stringify({ verdict: 'reject', code: 'opa_unavailable', message: error.message }, null, 2));
        process.exit(2);
      }
      
      console.error(JSON.stringify({ verdict: 'reject', code: 'internal_error', message: error.message }, null, 2));
      process.exit(1);
    }
  });

program.parse();
