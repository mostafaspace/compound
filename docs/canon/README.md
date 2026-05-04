# Compound Canon

Status: Canonical
Last updated: 2026-04-29

## Authority

This directory is the only authoritative source of truth for product behavior, system architecture, domain rules, delivery workflow, release gates, and contributor operating rules.

## Precedence

1. Files in `docs/canon/*`
2. Approved entries in `docs/canon/constitution-change-log.md`
3. Implementation plans that explicitly trace to canon
4. Jira tickets and comments as execution records
5. Archived or legacy docs
6. Current code behavior
7. Prior chat context not written into the repo or Jira evidence

## Rules

- Legacy docs do not override canon.
- Jira tracks execution and evidence; it does not redefine product truth.
- If code conflicts with canon, log the gap and fix the code or explicitly revise canon with approval.
- Canonical docs may change only through explicit human approval plus a change-log entry.

## Canon Index

- [Product Spec](./product-spec.md)
- [System Architecture](./system-architecture.md)
- [Domain Rules](./domain-rules.md)
- [Design System](./design-system.md)
- [Engineering Workflow](./engineering-workflow.md)
- [Definition Of Done](./definition-of-done.md)
- [Traceability Matrix](./traceability-matrix.md)
- [Recovery Matrix](./recovery-matrix.md)
- [Release Matrix](./release-matrix.md)
- [Recovery Backlog](./recovery-backlog.md)
- [Agent Operator Guide](./agent-operator-guide.md)
- [Constitution Change Log](./constitution-change-log.md)

## Audit Inputs

The canon was initialized from:

- the original platform brief
- current repo documentation
- current Jira project inventory
- approved recovery design in `docs/superpowers/specs/2026-04-29-platform-recovery-design.md`

## Archived Material

Historical or conflicting documents should move to `docs/archive/*` or be replaced with a short notice pointing back to canon.
