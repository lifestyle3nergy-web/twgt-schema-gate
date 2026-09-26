# Governance lifecycle

Governance rules in this repository are engineering inferences
(wiki.md §2.3), not historical facts. They were correct when written.
They may be wrong later.

Every rule carries four properties:

- **Constraint** — the concrete failure mode the rule prevents.
- **Evidence class** — the wiki.md taxonomy label for the evidence
  backing the rule (historical fact, measured result, engineering
  inference, research hypothesis).
- **Review trigger** — the event, time, or threshold that requires
  re-validation.
- **Deprecation condition** — the observable change in the environment
  that makes the rule obsolete.

A rule that fails its review trigger is flagged for review. A rule
whose deprecation condition is met is removed, not retained.

## Rules of change

1. Every rule lives in `rules.yaml`. The prose in this directory is
   descriptive, not normative.
2. Every rule change is a commit whose message names the rule ID and
   the reason. Example: `governance: deprecate G-01 / superseded by X`
3. Every rule change is proposed as a pull request, even by the owner.
   The governance rules cannot be modified outside the review process
   they enforce.
4. Removing a rule requires stating the deprecation condition that was
   met. Silence is not a deprecation reason.
5. Adding a rule requires stating its constraint and its evidence
   class. "It seemed prudent" is not an evidence class.

## Staleness detection

`.github/workflows/governance-review.yml` runs daily. It reads
`rules.yaml`, evaluates each rule's triggers, and opens a tracking
issue for any rule whose next review date has passed or whose event
trigger has fired. The workflow does not auto-modify rules. It only
surfaces them for human review.

## Relation to wiki.md

This file implements the update/upgrade discipline wiki.md applies to
engineering knowledge, applied to the governance rules themselves.

- wiki.md §5: "Measure outcomes and record lessons" — outcome here
  means whether the rule still prevents the constraint it was written
  for.
- wiki.md §9: EPR completion criteria — a governance rule is
  acceptable only if it carries the equivalent of an EPR: problem,
  evidence, limitation, review condition.

A governance rule without a stated constraint and a review trigger is
treated as unverified and is not adopted.

## Historical record

Every change to `rules.yaml` is reviewable in git history. Every
deprecation states the condition that was met. The record of what was
tried and rejected is as important as the record of what is enforced.
