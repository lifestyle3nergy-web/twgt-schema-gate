# Governance — twgt-schema-gate

## Branch protection (G-01)

The `main` branch is protected by both a branch protection rule and a
repository ruleset. The ruleset is exported to `ruleset.json` in this
directory.

## Required status checks

The following checks must pass on the exact head commit before merge:

- `registry-integrity`   (SG-01)
- `schema-fixtures`      (SG-02)
- `differential`         (SG-03)
- `safety-gate`          (SG-04)
- `privacy`              (SG-05)
- `supply-chain`         (SG-06)
- `reproducibility`      (G-02)

## Human approval

One approving review from a code owner is required. The reviewer must
record the exact head SHA and the CI run URL in the PR comment. CI
never self-approves; the release workflow contains no approval call.

## Release signing (G-03)

Tags matching `v*.*.*` trigger `.github/workflows/release.yml`. The
workflow signs every artifact with Sigstore keyless using the GitHub
Actions OIDC identity. Verification commands are documented in the
release body.

## EPR reference

This repository implements the mechanism required by
`EPR-019 · Enforce schema validation at every agent execution boundary`.
The EPR is authored in `wiki.md` and committed alongside the release
tag. Until EPR-019 is reviewed and approved, v0.1.0 is not published.

## Lifecycle

Governance rules are subject to the same update/upgrade discipline
wiki.md applies to engineering knowledge. See `governance/lifecycle.md`
for the policy and `governance/rules.yaml` for the machine-readable
rule registry.

Every rule carries a constraint, an evidence class, a review trigger,
and a deprecation condition. Rules that fail review are re-validated,
amended, or deprecated — not silently retained.

`.github/workflows/governance-review.yml` surfaces stale rules for
human review. It does not auto-modify them.
