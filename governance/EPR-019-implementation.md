# EPR-019 implementation contract

`twgt-schema-gate` is the enforcement layer for EPR-019.

## Boundary

Every agent execution boundary that claims conformance to v1 must use a schema listed in `schemas/registry.json`. The registry is the canonical inventory; the versioned schemas are immutable contracts.

## Required evidence

- Registry integrity is checked by Node and Python.
- Every v1 schema has a valid and invalid generated fixture.
- Node and Python must reach the same fixture verdict.
- Local `$ref` resolution is performed from the repository registry; CI does not depend on an unauthenticated GitHub Pages deployment to validate the contract.
- Missing schema, fixture, dependency, or reference resolution is a failure, not a skip.

## Fail-closed rule

Unknown schema versions, missing fixtures, malformed schemas, network failures, and validator errors must result in `HELD`/non-zero CI status. A green result is only valid when the declared checks actually executed.

## External evidence

`twgt-bridge` independently verifies the pinned registry at a specific commit using SHA256. A schema change is not externally verified until the bridge pin is deliberately regenerated and reviewed.

## Admission boundary

This repository proves **schema conformance**. It does not prove deployment safety, privacy approval, model quality, or operational fitness. Those are separate admission decisions.
