# Compound Platform Recovery & Governance Design

> Status: Proposed canonical recovery design
> Date: 2026-04-29
> Authoring context: Written after reviewing the original platform brief, current repo docs, current dirty workspace state, and Jira project `CM`

## 1. Goal

Reset the Compound platform onto a controlled, production-grade path by replacing conflicting project guidance with one authoritative repo-based source of truth, demoting Jira to execution tracking only, and establishing a hard delivery gate so no feature can be marked ready or done without real implementation, regression validation, and written evidence.

## 2. Problem Statement

The project currently suffers from documentation drift, implementation drift, and workflow drift.

Observed issues from the current repo and Jira state:

- Multiple instruction files define overlapping but conflicting rules.
- Existing Markdown documentation mixes architecture, process, launch readiness, AI prompts, and design guidance without a clear precedence model.
- Jira stories and comments appear to have been used as both specification and progress tracking, which created ambiguity and false completion signals.
- Some user stories were interpreted as replacements for prior behavior instead of scoped additions or refinements, causing regressions and fragmented feature behavior.
- The current codebase contains work that may be partially implemented, incorrectly implemented, or implemented without trustworthy regression protection.
- The web and mobile design-system master files already conflict, which is a direct signal that product and UX guidance has drifted.
- The workspace is currently dirty, so even the current local state cannot be treated as a clean baseline.

This means the current codebase is not the authority. It is evidence to audit against the original product intent.

## 3. Design Decision

Adopt `Option 1: Repo Constitution + Jira Execution`.

Under this model:

- Repo docs become the only authoritative source of truth.
- Jira becomes a strict execution and evidence queue.
- Code becomes implementation evidence, not behavioral authority.
- Existing conflicting docs are archived or replaced.
- Canonical docs become effectively immutable unless changed through explicit approval and recorded change control.

## 4. Governance Model

The project operates through three layers.

### 4.1 Canonical Repo Docs

These define product truth, architecture truth, delivery rules, design standards, and approval gates. If Jira, prompts, comments, or code conflict with canonical docs, canonical docs win until explicitly revised.

### 4.2 Jira Execution Layer

Jira tracks:

- scoped work
- order of execution
- blockers
- test evidence
- human test state
- recovery progress

Jira must not redefine business rules or silently replace existing behavior.

### 4.3 Code Implementation Layer

The codebase is what is currently implemented. It is not the source of truth when behavior is disputed. If code and canon differ, the difference is treated as a gap to audit and resolve.

## 5. Canonical Documentation Set

The platform should be unified under a new canonical document tree:

```text
docs/
  canon/
    README.md
    product-spec.md
    system-architecture.md
    domain-rules.md
    design-system.md
    engineering-workflow.md
    definition-of-done.md
    traceability-matrix.md
    agent-operator-guide.md
    constitution-change-log.md
  archive/
    ...
```

### 5.1 `docs/canon/README.md`

Defines document precedence, what is authoritative, and what has been archived.

### 5.2 `docs/canon/product-spec.md`

Unified product truth derived from:

- the original brief documents
- validated Jira intent
- approved recovery decisions

It defines personas, modules, workflows, statuses, permissions expectations, and non-goals.

### 5.3 `docs/canon/system-architecture.md`

Defines bounded contexts, data ownership, service boundaries, platform responsibilities, shared contracts, and cross-app integration rules.

### 5.4 `docs/canon/domain-rules.md`

Defines non-negotiable business logic including:

- authentication vs verification vs authorization
- RBAC and scoped access rules
- finance ledger behavior
- visitor lifecycle rules
- issue and escalation rules
- governance and voting eligibility
- document compliance rules
- audit requirements

### 5.5 `docs/canon/design-system.md`

Defines one unified cross-platform visual and interaction system for web and mobile:

- tokens
- color and typography
- component behavior
- spacing and elevation
- bilingual and RTL rules
- accessibility requirements
- platform-specific adaptation rules

### 5.6 `docs/canon/engineering-workflow.md`

Defines how work is executed:

- how a story starts
- how impact area is documented
- what can and cannot be changed
- required validation
- regression expectations
- handoff and evidence requirements

### 5.7 `docs/canon/definition-of-done.md`

Defines the hard gate for:

- `To Do -> In Progress`
- `In Progress -> Ready for Human Test`
- `Ready for Human Test -> Done`

### 5.8 `docs/canon/traceability-matrix.md`

Maps:

- original brief requirements
- canonical product requirements
- Jira work items
- implementation surfaces
- automated tests
- manual/UAT checks

This prevents new work from silently overriding old requirements.

### 5.9 `docs/canon/agent-operator-guide.md`

This is the only approved handoff guide for any human or model contributor. It must be simple, strict, and safe for capable and less-capable models alike.

### 5.10 `docs/canon/constitution-change-log.md`

Records all approved changes to canonical truth:

- what changed
- why it changed
- who approved it
- whether the change clarifies, extends, or replaces prior behavior
- which Jira items and code areas are affected

## 6. Document Precedence Rules

The following precedence order applies:

1. `docs/canon/*`
2. Approved entries in `docs/canon/constitution-change-log.md`
3. Current implementation plans that explicitly trace to canon
4. Jira tickets and subtasks
5. Existing non-canonical legacy docs
6. Current codebase behavior
7. Prior chat context not written into repo or Jira evidence

Any important information that exists only in chat is considered non-durable until written into canon or Jira evidence.

## 7. Lock Rules For Canonical Docs

Canonical docs are not casually editable.

Rules:

- Only `docs/canon/*` may define authoritative project truth.
- Conflicting legacy docs must move to `docs/archive/*` or be replaced with pointers to canon.
- Any canonical edit requires an explicit constitution-change workflow.
- Any constitution change must include a change-log entry.
- Any behavior replacement requires explicit human approval before implementation starts.
- Jira tickets may refine implementation details but may not override product truth, architecture, domain rules, or definition of done.
- Agent prompts and local model instructions in the repo must point back to canon rather than embedding parallel truth.

## 8. Jira Role After Recovery

Jira becomes the execution layer only.

Jira is responsible for:

- tracking work order
- holding implementation slices
- recording blockers
- storing evidence snapshots
- recording human test results
- exposing recovery status by subsystem

Jira is not responsible for:

- defining product truth
- redefining architecture
- changing domain rules
- silently replacing older behavior

### 8.1 Jira Comment Policy

Old Jira comments should be treated as historical context, not trusted truth.

Because currently exposed tools may allow adding comments but not deleting them, the reset policy should be:

- add one explicit reset-baseline comment on affected recovery tickets
- state that repo canon is now authoritative
- instruct future contributors to ignore pre-reset comments when they conflict with canon
- use a strict evidence comment template going forward

### 8.2 Evidence Comment Template

Every meaningful Jira progress comment should include:

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

## 9. Hard Delivery Gate

No story or subtask may move to `Ready for Human Test` unless all of the following are true:

- It traces to a canonical requirement.
- The impact area is explicitly documented before implementation.
- The code is implemented in the repo.
- Required automated checks were actually run.
- Required regression checks for the impact area were actually run.
- Required manual or human-test scenarios are recorded.
- Role, permission, and scope impact was verified if the workflow is protected.
- Arabic/English and RTL impact was checked for user-facing changes.
- Evidence was written into Jira using the approved template.

No item may move to `Done` unless:

- human validation passes
- no blocking regressions remain
- no required subtask is incomplete
- no canonical requirement gap remains hidden behind a partial implementation

### 9.1 Parent/Subtask Gate

A parent item may not move forward if any required child backend, frontend, QA, or regression obligation is incomplete.

### 9.2 False Completion Prevention

An item must never be marked `Ready for Human Test` or `Done` based only on:

- local reasoning
- partial implementation
- green happy-path tests only
- updated docs without code
- updated Jira without code
- code that works only in isolation but breaks adjacent behavior

## 10. Impact Area Requirement

Every implementation item must define its impact area before code changes start.

The impact area must answer:

- Which modules are directly touched?
- Which existing features could this change break?
- Which roles are affected?
- Which platforms are affected?
- Which related flows must be re-tested?
- Does the story extend, refine, or replace existing behavior?

If a story replaces existing behavior, canon must be updated and explicitly approved before implementation starts.

## 11. Whole-Platform Recovery Program

The recovery should proceed in five phases.

### Phase 1: Constitution Reset

- Create `docs/canon/*`
- define precedence rules
- archive or replace conflicting docs
- repoint prompts and handoff docs to canon
- freeze non-recovery feature work unless it directly supports recovery

### Phase 2: Reality Audit

Audit the current codebase against:

- original brief documents
- canonical docs
- existing Jira inventory

Each subsystem gets classified as:

- implemented correctly
- implemented partially
- implemented incorrectly
- documented but missing
- code exists but undocumented
- conflicting across platforms
- unsafe to trust

The output is a recovery matrix covering:

- auth
- verification
- RBAC
- property hierarchy
- onboarding
- documents
- org chart
- visitors
- issues
- announcements
- notifications
- finance
- governance
- admin UX
- mobile UX
- design system
- QA coverage
- launch readiness

### Phase 3: Foundation Stabilization

Stabilize the layers that can corrupt all other work:

- login and session flow
- auth/verification/authorization boundaries
- RBAC and scoped access
- compound/building/floor/unit isolation
- shared API contracts
- audit logging
- seeded test environments
- test harness trust
- navigation and shared design primitives

### Phase 4: Subsystem Recovery

Recover bounded areas in dependency order:

1. Auth / Verification / RBAC
2. Property hierarchy and scoping
3. Onboarding and document compliance
4. Announcements and notifications
5. Visitor and security workflows
6. Issues and escalation
7. Finance ledger, charges, payments, campaigns
8. Governance, polls, elections, org chart
9. Reporting, operational tooling, launch readiness

Each subsystem must have:

- canonical requirement mapping
- implementation gap list
- impact area map
- implementation plan
- automated test plan
- regression test set
- human UAT checklist
- Jira recovery tasks

### Phase 5: Production Readiness Program

After subsystem recovery:

- run persona-based end-to-end verification
- run critical-path regression packs
- review bilingual and RTL quality
- review cross-platform design consistency
- verify operational runbooks
- verify data migration and seed integrity
- verify launch gates with evidence only

## 12. Permanent Project Memory Model

Project memory must live outside any one model.

### 12.1 Canonical Memory

Lives in `docs/canon/*`. This is the durable brain.

### 12.2 Operational Memory

Lives in Jira as execution evidence, not behavioral truth.

### 12.3 Decision Memory

Lives in `docs/canon/constitution-change-log.md`.

### 12.4 Recovery Memory

Lives in the recovery matrix and subsystem audit outputs so future sessions do not rediscover the same failures.

### 12.5 Agent Handoff Memory

Lives in `docs/canon/agent-operator-guide.md`.

Core rule:

If important context exists only in chat, it is considered lost until written into canon, the recovery matrix, or Jira evidence.

## 13. Initial Legacy Documentation Findings

The following categories already show evidence of conflict or duplication and should be reviewed for archive or replacement during implementation:

- global AI instruction docs that embed workflow rules
- continuation prompts that duplicate project truth
- launch and QA docs that may overstate actual implementation readiness
- architecture and domain docs that are not clearly tied to current code validation
- separate design-system master files for web and mobile that disagree

This finding does not mean all legacy docs are wrong. It means they are not currently safe to treat as authoritative without canonical consolidation.

## 14. Non-Goals

This design does not assume:

- the current codebase should be thrown away immediately
- all current docs must be deleted rather than archived
- Jira comments can be physically deleted with currently exposed tools
- every subsystem will be rebuilt before any targeted fixes occur

Instead, it creates a controlled system for deciding what to preserve, repair, replace, or retire.

## 15. Success Criteria

The recovery design is successful when:

- there is one undisputed authoritative doc set
- Jira is used as execution tracking only
- no story can be marked ready or done without evidence
- impact-area regressions are part of normal work, not optional cleanup
- future models can continue safely without hidden context
- web and mobile converge on one design language
- the project can be audited for production readiness from repo docs and evidence alone

## 16. Recommended Next Step

After approval of this design:

1. Create the canonical doc tree.
2. Write the unified product spec from the original brief plus validated Jira intent.
3. Write the engineering workflow and definition-of-done canon first, because they control all later recovery work.
4. Build the whole-platform recovery matrix.
5. Generate the implementation plan for the recovery program.
