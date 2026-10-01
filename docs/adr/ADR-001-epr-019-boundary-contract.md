# ADR-001: EPR-019 boundary contract enforcement

- **Status:** Proposed
- **Date:** 2026-09-30
- **Decision owner:** lifestyle3nergy-web maintainers
- **Related:** EPR-019, https://github.com/lifestyle3nergy-web/engineering-intelligence/blob/main/epr/EPR-019-schema-validation-at-agent-boundaries.md

## Context

TWGT requires machine-checkable, versioned artifacts at agent execution boundaries. The repository currently publishes JSON Schemas and dual-runtime fixtures. Any extension must preserve exact schema identity, reject missing or malformed evidence, and avoid treating skipped validation as success.

## Decision

Retain the canonical schema registry as the source of truth. Boundary consumers must validate against an explicitly pinned registry revision and report a fail-closed result when the registry, schema, fixture, or evidence is absent, malformed, stale, or mismatched. Node and Python verdict parity remains required. No runtime may silently substitute a permissive schema or accept unknown versions.

## Consequences

- Valid and invalid fixtures must be executed in CI under both runtimes.
- Registry and pin changes require corresponding reviewed evidence.
- A failed or skipped required check cannot establish readiness.
- This ADR does not authorize release, merge, or deployment; those remain subject to exact-head gates and human review.

## Validation

Acceptance evidence must identify the exact commit SHA, workflow run, validator versions, fixture counts, and negative-test outcomes. Until that evidence is recorded, implementation status remains unverified.
