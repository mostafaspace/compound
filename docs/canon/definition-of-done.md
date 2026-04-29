# Compound Definition Of Done

Status: Canonical
Last updated: 2026-04-29
Change control: Updates require explicit approval and a constitution change-log entry

## Status Model

- `To Do`: not started
- `In Progress`: actively being investigated or implemented
- `Ready for Human Test`: implementation and validation gates passed from the engineering side
- `Done`: human validation passed and no blocking regression remains

## Ready for Human Test Gate

Required:

- code implemented
- canonical requirement traced
- impact area documented
- automated checks run
- impact-area regressions run
- human test scenarios listed
- evidence snapshot recorded
- permission and scope checks completed when relevant
- Arabic/English and RTL checks completed when relevant

## Done Gate

Required:

- human validation passed
- no blocking regressions
- no incomplete required subtask
- no unresolved canonical gap hidden by partial implementation

## Parent And Subtask Rule

A parent item may not move forward if any required backend, frontend, QA, or regression obligation is incomplete.

## False Completion Prohibited

An item must never be marked `Ready for Human Test` or `Done` based only on:

- local reasoning
- partial implementation
- green happy-path tests only
- updated docs without code
- updated Jira without code
- behavior that works in isolation but breaks adjacent flows
