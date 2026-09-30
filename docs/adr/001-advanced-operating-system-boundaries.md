# ADR-001 — Advanced operating-system validation boundaries

- **Status:** Proposed
- **Date:** 2026-09-29
- **Scope:** twgt-schema-gate
- **Related:** EPR-019

## Decision

Implement the schema gate as an explicit fail-closed boundary: registry integrity, schema fixtures, differential runtime parity, safety, privacy, supply-chain and reproducibility are separate checks.

No check may convert unavailable evidence or malformed input into PASS. Checks emit machine-readable state and return non-zero on HELD.

## Non-goals

This ADR grants no merge authority, runtime execution authority, repository write authority, or permission to bypass branch protection.

## Acceptance

All checks execute on the exact revision under test. Human review remains the final admission authority.
