# Compound Engineering Workflow

Status: Canonical
Last updated: 2026-04-29
Change control: Updates require explicit approval and a constitution change-log entry

## Workflow Intent

This workflow exists to prevent false completion, hidden regressions, and story-level reinterpretation of platform behavior.

## Story Start Checklist

Before implementation:

- identify the canonical requirement reference
- define the impact area
- identify affected roles and platforms
- identify required regression checks
- confirm whether the story extends, refines, or replaces existing behavior

If the work replaces existing behavior, update canon with explicit approval before implementation starts.

## Impact Area Template

- Direct modules touched:
- At-risk adjacent features:
- Roles affected:
- Platforms affected:
- Required regression checks:
- Authorization or data-scope risks:
- Localization risks:

## Execution Rules

- Start from canon, not Jira alone.
- Jira is the execution queue and evidence log.
- Legacy docs may inform context but cannot override canon.
- Avoid cross-cutting edits unless the impact area explicitly justifies them.
- Do not treat passing happy-path tests as proof of full recovery.

## Validation Rules

Every implementation slice must record:

- the checks that were run
- the checks that could not run
- regression checks for adjacent at-risk behavior
- bilingual and RTL review where user-facing changes exist
- permission and scope verification where protected workflows exist

## Jira Reset Baseline Comment

```text
[Recovery Reset]
Canonical project truth now lives in docs/canon/*.
Pre-reset comments are historical context only when they conflict with canon.
Future progress updates must include requirement traceability, impact area, validation evidence, and human test focus.
```

## Evidence Snapshot

Every meaningful Jira progress update must include:

- model or human identity
- canonical requirement reference
- files changed
- behavior implemented
- impact area reviewed
- automated checks run and results
- manual checks run and results
- remaining blockers
- human test focus
- commit or branch reference
