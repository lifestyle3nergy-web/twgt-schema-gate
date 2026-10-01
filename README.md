# twgt-schema-gate

TWGT schema gate — validate every boundary.

## Purpose

Implements EPR-019: schema validation at every agent execution boundary. The registry makes the accepted artifact shape explicit; the dual-runtime harness verifies that independent validators reach the same verdict.

## Current v1 contract

- Canonical registry: `schemas/registry.json`
- Eight v1 schemas
- 16 generated fixtures: one valid and one invalid per schema
- Node + Python contract validation
- Fail-closed fixture and registry checks
- Required main checks: `registry-integrity` and `schema-fixtures`

## Evidence relationship

```text
engineering-intelligence  ->  twgt-schema-gate  ->  twgt-bridge
        why                         what                 prove
```

This repository proves schema conformance. It does not independently authorize deployment or production admission.

See `governance/EPR-019-implementation.md` and `governance/README.md`.
