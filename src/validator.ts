import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';

// Import the draft-07 meta-schema so Ajv2020 can understand it
import draft7MetaSchema from 'ajv/dist/refs/json-schema-draft-07.json';

export class Validator {
  private ajv: Ajv2020;
  private registryPath: string;
  private relationshipSchemaPath: string;

  constructor() {
    this.ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(this.ajv);
    
    // Add Draft-07 support to the 2020-12 engine
    this.ajv.addMetaSchema(draft7MetaSchema);
    
    this.registryPath = path.resolve(__dirname, '../schemas');
    this.relationshipSchemaPath = path.dirname(require.resolve('@twgt/relationship-types/package.json'));
    
    this.loadSchemas();
  }

  private loadSchemas() {
    // 1. Load the registry schemas
    const registryFile = path.join(this.registryPath, 'registry.json');
    if (fs.existsSync(registryFile)) {
      const registry = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
      for (const schema of registry.schemas) {
        const schemaPath = path.join(this.registryPath, schema.path);
        if (fs.existsSync(schemaPath)) {
          const schemaData = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
          this.ajv.addSchema(schemaData);
        }
      }
    }

    // 2. Load the relationship schemas
    const relSchemasDir = path.join(this.relationshipSchemaPath, 'src/schemas');
    if (fs.existsSync(relSchemasDir)) {
      for (const file of fs.readdirSync(relSchemasDir)) {
        if (file.endsWith('.json')) {
          const schemaData = JSON.parse(fs.readFileSync(path.join(relSchemasDir, file), 'utf8'));
          this.ajv.addSchema(schemaData);
        }
      }
    }
  }

  public validate(relationship: any): { valid: boolean; errors: any[] | null } {
    let schemaId = 'https://twgt.lifestyle3nergy.com/schemas/relationship.base.schema.json';
    if (relationship.kind === 'ownership') {
      schemaId = 'https://twgt.lifestyle3nergy.com/schemas/ownership.schema.json';
    }

    const validateFn = this.ajv.getSchema(schemaId);
    if (!validateFn) {
      return { valid: false, errors: [{ message: `Schema not found for kind: ${relationship.kind}` }] };
    }

    const valid = validateFn(relationship) as boolean;
    return { valid, errors: validateFn.errors || null };
  }
}
