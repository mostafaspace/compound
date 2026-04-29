# Compound Platform Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a canonical repo-based source of truth, archive conflicting guidance, build a whole-platform recovery matrix, and create the execution controls needed to recover the platform safely toward production.

**Architecture:** The work starts with governance and documentation, not feature coding. Canonical docs become the constitution, Jira becomes execution tracking only, and the current codebase is audited against the canon before subsystem recovery begins. Recovery then proceeds by stabilizing shared foundations and repairing bounded subsystems with explicit regression gates.

**Tech Stack:** Markdown docs, Jira CM project, monorepo apps (`apps/api`, `apps/admin`, `apps/mobile`), shared contracts, existing automated tests, shell validation, optional Docker-backed backend verification.

---

### Task 1: Create The Canonical Documentation Skeleton

**Files:**
- Create: `docs/canon/README.md`
- Create: `docs/canon/product-spec.md`
- Create: `docs/canon/system-architecture.md`
- Create: `docs/canon/domain-rules.md`
- Create: `docs/canon/design-system.md`
- Create: `docs/canon/engineering-workflow.md`
- Create: `docs/canon/definition-of-done.md`
- Create: `docs/canon/traceability-matrix.md`
- Create: `docs/canon/agent-operator-guide.md`
- Create: `docs/canon/constitution-change-log.md`
- Test: visual review of Markdown structure and cross-links

- [ ] **Step 1: Write the canonical README first**

```md
# Compound Canon

## Authority

This directory is the only authoritative source of truth for product behavior, architecture, delivery workflow, and release gates.

## Precedence

1. Files in `docs/canon/*`
2. Approved entries in `docs/canon/constitution-change-log.md`
3. Implementation plans that explicitly trace to canon
4. Jira tickets as execution records
5. Archived or legacy docs
6. Current code behavior

## Rules

- Legacy docs do not override canon.
- Jira does not redefine product truth.
- If code conflicts with canon, log the gap and fix the code or explicitly revise canon with approval.
```

- [ ] **Step 2: Run a quick check that the new directory and files exist**

Run: `test -d docs/canon && printf '%s\n' docs/canon/*.md`
Expected: all canonical file paths print without shell errors

- [ ] **Step 3: Draft minimal, non-placeholder headers for each canonical file**

```md
# Product Spec

Status: Canonical
Last updated: 2026-04-29
Change control: Updates require explicit approval and a constitution change-log entry
```

- [ ] **Step 4: Cross-link the files from `docs/canon/README.md`**

```md
- [Product Spec](./product-spec.md)
- [System Architecture](./system-architecture.md)
- [Domain Rules](./domain-rules.md)
- [Design System](./design-system.md)
- [Engineering Workflow](./engineering-workflow.md)
- [Definition Of Done](./definition-of-done.md)
- [Traceability Matrix](./traceability-matrix.md)
- [Agent Operator Guide](./agent-operator-guide.md)
- [Constitution Change Log](./constitution-change-log.md)
```

- [ ] **Step 5: Commit**

```bash
git add docs/canon
git commit -m "docs: add canonical documentation skeleton"
```

### Task 2: Consolidate The Unified Product Spec From The Original Brief

**Files:**
- Modify: `docs/canon/product-spec.md`
- Reference: `/Users/mostafamagdy/Downloads/owners_association_platform_brief_v4_finance.md`
- Reference: `docs/superpowers/specs/2026-04-29-platform-recovery-design.md`
- Test: Markdown review for complete module coverage

- [ ] **Step 1: Write the product-spec table of contents**

```md
## Product Vision
## Personas
## Access, Verification, and Roles
## Property Hierarchy
## Documents and Compliance
## Security and Visitor Management
## Issues and Escalation
## Announcements and Notifications
## Finance
## Governance, Polls, and Elections
## Cross-Platform UX Principles
## Non-Goals
```

- [ ] **Step 2: Capture the personas and access model directly from the brief**

```md
## Personas

- Owner
- Resident / Occupant
- Tenant
- Shop Holder / Commercial Occupant
- Floor Representative
- Building Representative
- Owners Association Member
- President / Head of Association
- Treasurer / Finance Admin
- Security Staff
- Admin / Verification Panel
- Super Admin
```

- [ ] **Step 3: Encode the “authentication vs verification vs authorization” rule**

```md
## Access, Verification, and Roles

- Authentication proves identity.
- Verification proves property linkage and document compliance.
- Authorization determines allowed actions and data scope.
- No workflow may collapse these three concepts into a single “role” flag.
```

- [ ] **Step 4: Capture each major module and its canonical statuses**

```md
## Security and Visitor Management

Canonical visitor statuses:
- Pending
- QR Issued
- Arrived
- Allowed
- Denied
- Completed
```

- [ ] **Step 5: Run a coverage scan against the original brief**

Run: `rg -n "^## |^### |^- " docs/canon/product-spec.md`
Expected: every major brief area appears in the spec with no empty sections

- [ ] **Step 6: Commit**

```bash
git add docs/canon/product-spec.md
git commit -m "docs: write canonical product spec"
```

### Task 3: Write Canonical Architecture And Domain Rules

**Files:**
- Modify: `docs/canon/system-architecture.md`
- Modify: `docs/canon/domain-rules.md`
- Reference: `docs/architecture.md`
- Reference: `docs/backend/domain-rules.md`
- Reference: `docs/superpowers/specs/2026-04-26-rbac-design.md`
- Test: consistency review between architecture and domain rules

- [ ] **Step 1: Define bounded contexts in `system-architecture.md`**

```md
## Bounded Contexts

- Identity and Access
- Property Registry
- Documents and Compliance
- Visitors and Security
- Issues and Escalation
- Announcements and Notifications
- Finance Ledger and Collections
- Governance and Representation
- Audit and Reporting
```

- [ ] **Step 2: State data ownership for each app**

```md
## App Responsibilities

- `apps/api` is the system of record for business rules, persistence, audit trails, and authorization.
- `apps/admin` is the operations interface for administrators, finance reviewers, governance managers, and support roles.
- `apps/mobile` is the resident and guard operational client.
- `packages/contracts` is the shared contract layer and must match backend behavior.
```

- [ ] **Step 3: Write non-negotiable RBAC and scoping rules in `domain-rules.md`**

```md
## RBAC and Scope

- Authorization must be database-driven and scope-aware.
- Scope may be platform, compound, building, floor, or unit.
- A user may hold multiple scoped assignments.
- Protected queries must filter by effective scope, not by UI visibility alone.
```

- [ ] **Step 4: Write non-negotiable finance and audit rules**

```md
## Finance Ledger Rules

- Unit accounts are the primary financial entity.
- Balances are changed only through charges, payments, allocations, adjustments, waivers, refunds, or reversals.
- Silent balance edits are forbidden.
- Every financial mutation must be auditable.
```

- [ ] **Step 5: Run a terminology consistency scan**

Run: `rg -n "scope|authorization|ledger|audit|verification" docs/canon/system-architecture.md docs/canon/domain-rules.md`
Expected: shared terminology appears consistently across both files

- [ ] **Step 6: Commit**

```bash
git add docs/canon/system-architecture.md docs/canon/domain-rules.md
git commit -m "docs: define canonical architecture and domain rules"
```

### Task 4: Unify The Cross-Platform Design System

**Files:**
- Modify: `docs/canon/design-system.md`
- Reference: `design-system/compound/MASTER.md`
- Reference: `apps/mobile/design-system/compound/MASTER.md`
- Test: explicit conflict resolution notes included in canonical design system

- [ ] **Step 1: Document the design-system conflict as an input**

```md
## Inputs Reviewed

- `design-system/compound/MASTER.md`
- `apps/mobile/design-system/compound/MASTER.md`

These legacy files conflict and are no longer authoritative after canon adoption.
```

- [ ] **Step 2: Define one shared token foundation**

```md
## Core Tokens

- Color roles: primary, secondary, accent, surface, border, text, muted, success, warning, danger
- Typography roles: display, heading, title, body, label, mono
- Space scale: 4, 8, 12, 16, 24, 32, 48, 64
- Radius scale: 8, 12, 16, 24
- Elevation scale: subtle, card, overlay, modal
```

- [ ] **Step 3: Define bilingual and RTL rules**

```md
## Localization and RTL

- All user-facing features must support English and Arabic in the same slice.
- Arabic layouts must be reviewed in RTL mode.
- Components must tolerate text expansion and mirrored layouts.
```

- [ ] **Step 4: Define platform adaptation rules without splitting visual language**

```md
## Platform Adaptation

- Web and mobile may adapt interaction patterns for platform ergonomics.
- Visual identity, token system, status semantics, and information hierarchy must remain consistent.
```

- [ ] **Step 5: Run a final scan for conflicting style directives**

Run: `rg -n "dark mode|light mode|font|color" docs/canon/design-system.md`
Expected: one coherent set of design directives with no mutually exclusive defaults

- [ ] **Step 6: Commit**

```bash
git add docs/canon/design-system.md
git commit -m "docs: unify canonical design system"
```

### Task 5: Encode The Engineering Workflow And Definition Of Done

**Files:**
- Modify: `docs/canon/engineering-workflow.md`
- Modify: `docs/canon/definition-of-done.md`
- Reference: `docs/system-instructions.md`
- Reference: `docs/agent-continuation-prompt.md`
- Reference: `docs/local-ai-agent-prompt.md`
- Test: workflow and gate docs align with the approved recovery design

- [ ] **Step 1: Write the story-start checklist**

```md
## Story Start Checklist

Before implementation:
- identify canonical requirement reference
- define impact area
- identify affected roles and platforms
- identify required regression pack
- confirm whether the story extends, refines, or replaces existing behavior
```

- [ ] **Step 2: Write the impact-area template**

```md
## Impact Area Template

- Direct modules touched:
- At-risk adjacent features:
- Roles affected:
- Platforms affected:
- Required regression checks:
- Authorization or data-scope risks:
- Localization risks:
```

- [ ] **Step 3: Write the hard `Ready for Human Test` gate**

```md
## Ready for Human Test Gate

Required:
- code implemented
- automated checks run
- impact-area regressions run
- evidence snapshot recorded
- human test scenarios listed
```

- [ ] **Step 4: Write the `Done` gate**

```md
## Done Gate

Required:
- human validation passed
- no blocking regressions
- no incomplete required subtask
- no unresolved canonical gap hidden by partial implementation
```

- [ ] **Step 5: Run a contradiction scan against legacy workflow docs**

Run: `rg -n "main|worktree|Ready For Human Test|Done|Jira" docs/canon/engineering-workflow.md docs/canon/definition-of-done.md docs/system-instructions.md docs/agent-continuation-prompt.md docs/local-ai-agent-prompt.md`
Expected: legacy contradictions are visible and the canonical docs are clearly stricter and authoritative

- [ ] **Step 6: Commit**

```bash
git add docs/canon/engineering-workflow.md docs/canon/definition-of-done.md
git commit -m "docs: define canonical workflow and delivery gates"
```

### Task 6: Write The Traceability Matrix And Recovery Matrix

**Files:**
- Modify: `docs/canon/traceability-matrix.md`
- Create: `docs/canon/recovery-matrix.md`
- Reference: `docs/qa/story-test-traceability.md`
- Reference: Jira CM inventory
- Test: all major subsystems represented in both matrices

- [ ] **Step 1: Write the canonical traceability columns**

```md
| Requirement ID | Canon Section | Jira Workstream/Story | Code Surface | Automated Tests | Human Tests | Status |
|---|---|---|---|---|---|---|
```

- [ ] **Step 2: Write the recovery matrix columns**

```md
| Subsystem | Canon Reference | Current Code Status | Risk Level | Major Gaps | Recovery Priority | Notes |
|---|---|---|---|---|---|---|
```

- [ ] **Step 3: Seed the recovery matrix with the full subsystem list**

```md
| Auth / Verification / RBAC | domain-rules.md | Unsafe to trust | Critical | Login, role drift, scope validation | P0 | Foundation slice |
| Finance | product-spec.md | Unknown | Critical | Ledger and payment audit integrity | P0 | High business risk |
```

- [ ] **Step 4: Link existing automated coverage where it is trustworthy**

```md
| P02-AUTH | Access, Verification, and Roles | CM-2 | apps/api auth routes | AuthTest.php | docs/qa/... | Audit pending |
```

- [ ] **Step 5: Run a quick row-count check**

Run: `rg -c "^\\|" docs/canon/traceability-matrix.md docs/canon/recovery-matrix.md`
Expected: both files contain table rows for all major subsystems and requirement groups

- [ ] **Step 6: Commit**

```bash
git add docs/canon/traceability-matrix.md docs/canon/recovery-matrix.md
git commit -m "docs: add canonical traceability and recovery matrices"
```

### Task 7: Write The Agent Operator Guide And Repoint Repo Instructions

**Files:**
- Modify: `docs/canon/agent-operator-guide.md`
- Modify: `docs/system-instructions.md`
- Modify: `docs/agent-continuation-prompt.md`
- Modify: `docs/local-ai-agent-prompt.md`
- Modify: `CLAUDE.md`
- Modify: `apps/admin/AGENTS.md`
- Test: all agent-facing docs point back to canon instead of owning separate truth

- [ ] **Step 1: Write the operator-guide startup rules**

```md
## Startup Rules

1. Read `docs/canon/README.md`.
2. Read the canon sections relevant to the task.
3. Treat Jira as execution tracking only.
4. Define the impact area before touching code.
5. Do not trust legacy docs over canon.
```

- [ ] **Step 2: Reduce legacy instruction files to short pointers**

```md
# Legacy Instruction Notice

Authoritative workflow and product rules now live in `docs/canon/README.md` and related canonical documents.
This file is a convenience pointer only and must not define conflicting truth.
```

- [ ] **Step 3: Preserve any still-useful file-local notes only if they do not conflict**

```md
## Local Notes

- This app uses Next.js conventions documented in the local framework notes.
- Framework-specific implementation details do not override canon.
```

- [ ] **Step 4: Run a repo scan for stale “source of truth” claims**

Run: `rg -n "source of truth|Jira is the source of truth|Jira is the brain|work directly on main|authoritative" docs CLAUDE.md apps/admin/AGENTS.md`
Expected: conflicting authority claims are either removed or replaced with canon pointers

- [ ] **Step 5: Commit**

```bash
git add docs/canon/agent-operator-guide.md docs/system-instructions.md docs/agent-continuation-prompt.md docs/local-ai-agent-prompt.md CLAUDE.md apps/admin/AGENTS.md
git commit -m "docs: repoint agent instructions to canonical guidance"
```

### Task 8: Archive Or Replace Conflicting Legacy Docs

**Files:**
- Create: `docs/archive/README.md`
- Move/Modify: conflicting legacy docs identified during audit
- Test: archived docs clearly marked non-authoritative

- [ ] **Step 1: Create the archive README**

```md
# Archived Documentation

Files in this directory are retained for historical reference only.
They are not authoritative and must not override `docs/canon/*`.
```

- [ ] **Step 2: Move clearly conflicting docs into archive where safe**

Run: `mkdir -p docs/archive`
Expected: archive directory exists before any file moves

- [ ] **Step 3: Where moves are risky, replace file bodies with archive notices and canon links**

```md
# Legacy Document Notice

This document has been superseded by the canonical documentation set in `docs/canon/*`.
Use the canonical docs for all current work.
```

- [ ] **Step 4: Run a file listing for archive review**

Run: `find docs/archive -maxdepth 2 -type f | sort`
Expected: archived files are visible and grouped for human review

- [ ] **Step 5: Commit**

```bash
git add docs/archive docs
git commit -m "docs: archive conflicting legacy documentation"
```

### Task 9: Establish The Jira Recovery Baseline

**Files:**
- Modify: `docs/canon/engineering-workflow.md`
- Modify: `docs/canon/definition-of-done.md`
- External: Jira project `CM`
- Test: at least one reset-baseline comment template is documented and ready to use

- [ ] **Step 1: Document the reset-baseline Jira comment template in canon**

```md
## Jira Reset Baseline Comment

[Recovery Reset]
Canonical project truth now lives in `docs/canon/*`.
Pre-reset comments are historical context only when they conflict with canon.
Future progress updates must include requirement traceability, impact area, validation evidence, and human test focus.
```

- [ ] **Step 2: Add or update Jira comments on the active recovery umbrella ticket(s)**

Run: `echo "Use Atlassian MCP to post reset-baseline comment to the chosen CM recovery ticket(s)"`
Expected: comment content is ready before MCP submission

- [ ] **Step 3: Record the Jira ticket IDs that now represent recovery governance**

```md
## Recovery Governance Tracking

- Recovery umbrella:
- Canon migration:
- Foundation stabilization:
- Audit matrix:
```

- [ ] **Step 4: Commit**

```bash
git add docs/canon/engineering-workflow.md docs/canon/definition-of-done.md
git commit -m "docs: add Jira recovery baseline policy"
```

### Task 10: Execute The Reality Audit For Foundation Slices

**Files:**
- Modify: `docs/canon/recovery-matrix.md`
- Create: `docs/canon/audits/foundation-auth-rbac.md`
- Create: `docs/canon/audits/foundation-scoping.md`
- Create: `docs/canon/audits/foundation-contracts.md`
- Test: audit classifications are filled with evidence, not placeholders

- [ ] **Step 1: Write the audit template once**

```md
# Audit Template

## Canon Reference
## Current Code Surfaces
## Expected Behavior
## Observed Behavior
## Classification
## Risks
## Required Recovery Actions
## Tests To Trust / Tests Missing
```

- [ ] **Step 2: Audit auth and RBAC first**

Run: `rg -n "login|auth|permission|role|scope" apps/api apps/admin apps/mobile packages/contracts`
Expected: key auth and RBAC surfaces are identified for review

- [ ] **Step 3: Classify each foundation slice in `recovery-matrix.md`**

```md
| Auth / Verification / RBAC | domain-rules.md | Implemented partially | Critical | Login failure, permission drift, scope mismatch | P0 | Audit file linked |
```

- [ ] **Step 4: Repeat for scoping and shared contracts**

Run: `rg -n "compound|building|floor|unit|AuthenticatedUser|permissions" apps/api apps/admin apps/mobile packages/contracts`
Expected: shared scope and contract surfaces are linked into the audit files

- [ ] **Step 5: Commit**

```bash
git add docs/canon/recovery-matrix.md docs/canon/audits
git commit -m "docs: audit foundation recovery slices"
```

### Task 11: Write The Subsystem Recovery Backlog

**Files:**
- Modify: `docs/canon/recovery-matrix.md`
- Create: `docs/canon/recovery-backlog.md`
- External: Jira CM project
- Test: every major subsystem has a recovery order and gate

- [ ] **Step 1: Write backlog sections by recovery order**

```md
## P0 Foundations
- Auth / Verification / RBAC
- Property hierarchy and scoping
- Shared contracts

## P1 Core Operations
- Onboarding and compliance
- Visitors and security
- Issues and escalation
```

- [ ] **Step 2: Add per-subsystem exit criteria**

```md
### Auth / Verification / RBAC

Exit criteria:
- login works for required personas
- role and scope checks are trustworthy
- admin and resident boundaries are regression-tested
```

- [ ] **Step 3: Mirror the backlog into Jira workstreams or umbrella tasks**

Run: `echo "Use Jira MCP to create or normalize recovery tracking tickets only after canon backlog is finalized"`
Expected: repo backlog is finalized before Jira structure changes

- [ ] **Step 4: Commit**

```bash
git add docs/canon/recovery-backlog.md docs/canon/recovery-matrix.md
git commit -m "docs: define subsystem recovery backlog"
```

### Task 12: Validate The Canon Migration Before Feature Recovery Starts

**Files:**
- Modify: `docs/canon/constitution-change-log.md`
- Modify: `docs/canon/README.md`
- Test: repo scan confirms canon is now the authoritative layer

- [ ] **Step 1: Record the initial constitution entry**

```md
## 2026-04-29 - Canon Adoption

- Adopted repo canon as authoritative project truth
- Demoted Jira to execution tracking
- Established hard Ready for Human Test / Done gates
- Began legacy documentation archive process
```

- [ ] **Step 2: Run a final authority scan**

Run: `rg -n "source of truth|authoritative|Ready for Human Test|Done" docs CLAUDE.md apps/admin/AGENTS.md`
Expected: canon owns the authoritative language and legacy conflicts are either archived or redirected

- [ ] **Step 3: Run a final file inventory for the new canon**

Run: `find docs/canon -maxdepth 2 -type f | sort`
Expected: canonical docs, matrices, and audit files are all present

- [ ] **Step 4: Commit**

```bash
git add docs/canon
git commit -m "docs: finalize canonical recovery baseline"
```

