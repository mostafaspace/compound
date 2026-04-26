# UAT Scenarios by Persona

**Compound Management Platform — CM-128**
**Date:** 2026-04-25 | **Environment:** UAT (`https://uat-api.compound.local`)

---

## UAT Credentials

All UAT accounts use password: **`uat-password-2026`**

| Persona | Email | Role |
|---------|-------|------|
| Super Admin | super-admin@uat.compound.local | super_admin |
| Compound Admin | compound-admin@uat.compound.local | compound_admin |
| Board Member | board-member@uat.compound.local | board_member |
| Finance Reviewer | finance-reviewer@uat.compound.local | finance_reviewer |
| Security Guard | security-guard@uat.compound.local | security_guard |
| Support Agent | support-agent@uat.compound.local | support_agent |
| Resident Owner | resident-owner@uat.compound.local | resident_owner |
| Resident Tenant | resident-tenant@uat.compound.local | resident_tenant |

---

## Persona 1: Super Admin

### UAT-SA-01 — Compound onboarding
- [ ] Sign in as `super-admin@uat.compound.local`
- [ ] Navigate to **Compounds → New**
- [ ] Create a compound with name, address, timezone = Africa/Cairo
- [ ] Verify onboarding checklist appears at `/compounds/{id}/onboarding`
- [ ] Mark compound status Active

### UAT-SA-02 — Settings management
- [ ] Navigate to **Settings**
- [ ] Change `visitors.max_visitors_per_unit_per_day` to 5 for the UAT compound
- [ ] Verify change is saved and reflected on next load
- [ ] Check audit log shows `settings.updated` entry

### UAT-SA-03 — User support console
- [ ] Navigate to **Support → Users**
- [ ] Search for a resident by email
- [ ] View support view for that user
- [ ] Suspend the user; verify status changes
- [ ] Reactivate the user

### UAT-SA-04 — Launch readiness gate
- [ ] Navigate to **Launch** page in admin
- [ ] Verify all infrastructure checks show ✓
- [ ] Verify UAT personas are listed as seeded
- [ ] Verify APP_DEBUG shows warning if enabled

---

## Persona 2: Compound Admin

### UAT-CA-01 — Building and unit management
- [ ] Sign in as `compound-admin@uat.compound.local`
- [ ] Navigate to **Compounds → Buildings → New**
- [ ] Add a building with 2 floors and 6 units
- [ ] Assign a resident invitation to unit 101

### UAT-CA-02 — Resident invitation flow
- [ ] Navigate to **Invitations → New**
- [ ] Invite `new-resident@example.com` as resident_owner to unit 101
- [ ] Verify invitation email is dispatched (check mail log or Mailtrap)
- [ ] Accept the invitation as the resident (open the invite link)
- [ ] Verify resident appears in unit 101 membership list

### UAT-CA-03 — Issue management
- [ ] Navigate to **Issues**
- [ ] Review an open issue
- [ ] Escalate an issue older than 72 hours
- [ ] Verify escalation audit log entry is created

### UAT-CA-04 — Announcement publishing
- [ ] Navigate to **Announcements → New**
- [ ] Create an "urgent" announcement
- [ ] Publish it; verify residents can see it on their feed
- [ ] Mark one unit's acknowledgement

### UAT-CA-05 — Work order lifecycle
- [ ] Navigate to **Work Orders → New**
- [ ] Create a plumbing work order for Building A
- [ ] Submit for review → Approve → Start → Complete
- [ ] Verify all status transitions are reflected
- [ ] Verify audit log records each transition

---

## Persona 3: Board Member

### UAT-BM-01 — Governance vote
- [ ] Sign in as `board-member@uat.compound.local`
- [ ] Navigate to **Governance → New Vote**
- [ ] Create a vote: "Approve 2026 maintenance budget?" with 2 options
- [ ] Activate the vote (min duration 24h)
- [ ] Cast a vote as resident_owner
- [ ] Close the vote as board_member; verify result tallied correctly

### UAT-BM-02 — Meeting management
- [ ] Navigate to **Meetings → New**
- [ ] Schedule a General Assembly meeting 7 days out
- [ ] Add 3 agenda items
- [ ] Add the resident_owner as participant
- [ ] RSVP as resident_owner
- [ ] Record minutes and publish

---

## Persona 4: Finance Reviewer

### UAT-FR-01 — Unit account and charge
- [ ] Sign in as `finance-reviewer@uat.compound.local`
- [ ] Navigate to **Finance → Unit Accounts**
- [ ] Create a ledger entry (monthly service charge) for unit 101
- [ ] Verify balance is updated

### UAT-FR-02 — Payment submission review
- [ ] Submit a payment as resident_owner (via `/my/finance/unit-accounts`)
- [ ] Sign in as finance_reviewer; navigate to **Finance → Payments**
- [ ] Approve the payment submission
- [ ] Verify unit account balance is reduced

### UAT-FR-03 — Finance reports
- [ ] Navigate to **Finance → Reports → Summary**
- [ ] Verify collection rate, paid/unpaid totals render
- [ ] Export the report (check CSV/JSON response)

### UAT-FR-04 — Budget and reserve fund
- [ ] Create a 2026 budget with two categories
- [ ] Activate the budget
- [ ] Create a reserve fund and add a movement
- [ ] Verify movement balance is reflected

---

## Persona 5: Security Guard

### UAT-SG-01 — Visitor pass validation
- [ ] Sign in as `security-guard@uat.compound.local`
- [ ] Navigate to the security console
- [ ] Validate a visitor pass code (created by resident_owner)
- [ ] Allow the visitor through; verify entry logged

### UAT-SG-02 — Incident reporting
- [ ] Navigate to **Security → Incidents → New**
- [ ] Log a noise complaint incident
- [ ] Verify incident appears in admin incidents list
- [ ] Admin resolves the incident

### UAT-SG-03 — Shift management
- [ ] Verify guard is assigned to an active shift
- [ ] Check in at shift start; check out at shift end
- [ ] Verify timestamps recorded in shift assignment

---

## Persona 6: Support Agent

### UAT-AGT-01 — User duplicate detection
- [ ] Sign in as `support-agent@uat.compound.local`
- [ ] Navigate to **Support → Users → {user} → Duplicates**
- [ ] Verify duplicate detection returns relevant results

### UAT-AGT-02 — Account merge
- [ ] Initiate a merge between two test accounts
- [ ] Confirm merge
- [ ] Verify secondary account is merged and audit log entry created

---

## Persona 7: Resident Owner

### UAT-RO-01 — Onboarding document upload
- [ ] Sign in as `resident-owner@uat.compound.local`
- [ ] Upload national ID document
- [ ] Verify document appears in admin verification queue

### UAT-RO-02 — Issue submission
- [ ] Submit a maintenance issue with description and attachments
- [ ] Verify issue is visible to compound_admin
- [ ] Track issue status updates

### UAT-RO-03 — Privacy consent
- [ ] Accept privacy_policy version 1.0
- [ ] Accept terms_of_service version 1.0
- [ ] Verify consents appear in admin privacy view

### UAT-RO-04 — Data export request
- [ ] Request a personal data export
- [ ] Admin processes the export
- [ ] Verify status changes to "ready"

---

## Persona 8: Resident Tenant

### UAT-RT-01 — Visitor request
- [ ] Sign in as `resident-tenant@uat.compound.local`
- [ ] Create a visitor request for tomorrow, 2 guests
- [ ] Verify visitor pass is generated
- [ ] Cancel the request; verify cancellation reflected

### UAT-RT-02 — Announcement feed
- [ ] Navigate to `/my/announcements`
- [ ] Verify published announcements appear
- [ ] Acknowledge an urgent announcement

### UAT-RT-03 — Voting eligibility
- [ ] Navigate to an active vote
- [ ] Check eligibility (resident_tenant may be ineligible for owners-only votes)
- [ ] Verify eligibility message is accurate

---

## Sign-off Sheet

| Persona | Tested by | Date | Sign-off |
|---------|-----------|------|---------|
| Super Admin | | | ☐ |
| Compound Admin | | | ☐ |
| Board Member | | | ☐ |
| Finance Reviewer | | | ☐ |
| Security Guard | | | ☐ |
| Support Agent | | | ☐ |
| Resident Owner | | | ☐ |
| Resident Tenant | | | ☐ |

**UAT Overall Sign-off:** _________________ Date: _________
