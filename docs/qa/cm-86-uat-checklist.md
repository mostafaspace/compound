# CM-86 UAT Checklist by Persona

> **Purpose:** Structured UAT scenarios covering all critical workflows before production launch.
> **Password for all UAT accounts:** `password`

## UAT Account Reference

| Persona | Email | Role |
|---------|-------|------|
| Super Admin | uat-super-admin@compound.local | super_admin |
| Compound Admin | uat-compound-admin@compound.local | compound_admin |
| Board Member | uat-board-member@compound.local | board_member |
| Finance Reviewer | uat-finance-reviewer@compound.local | finance_reviewer |
| Security Guard | uat-security-guard@compound.local | security_guard |
| Resident Owner | uat-resident-owner@compound.local | resident_owner |
| Resident Tenant | uat-resident-tenant@compound.local | resident_tenant |
| Support Agent | uat-support-agent@compound.local | support_agent |

---

## 1. Super Admin

| # | Scenario | Steps | Expected Result | Pass/Fail |
|---|----------|-------|-----------------|-----------|
| 1.1 | Login as Super Admin | Navigate to `/login`, enter credentials | Redirected to dashboard | ☐ |
| 1.2 | View all compounds | Navigate to Compounds | List of all compounds visible | ☐ |
| 1.3 | Create new compound | Fill compound creation form | Compound created, appears in list | ☐ |
| 1.4 | Switch between compounds | Use compound switcher | Context switches, data scoped correctly | ☐ |
| 1.5 | View audit logs | Navigate to Audit Logs | Activity log with filter options | ☐ |
| 1.6 | View audit timeline | Open a specific entity timeline | Timeline of changes for that entity | ☐ |
| 1.7 | Access support console | Navigate to Support → Users | Can view, manage users across compounds | ☐ |

---

## 2. Compound Admin

| # | Scenario | Steps | Expected Result | Pass/Fail |
|---|----------|-------|-----------------|-----------|
| 2.1 | Login as Compound Admin | Navigate to `/login`, enter credentials | Redirected to dashboard | ☐ |
| 2.2 | View dashboard | Land on home page | Dashboard with compound overview | ☐ |
| 2.3 | Manage buildings | Navigate to Buildings | CRUD buildings, floors, units | ☐ |
| 2.4 | Import units via CSV | Navigate to Imports, upload CSV | Batch processed, units created | ☐ |
| 2.5 | Manage charge types | Navigate to Dues → Charge Types | CRUD charge types | ☐ |
| 2.6 | Create collection campaign | Navigate to Dues, start campaign | Campaign created, charges generated | ☐ |
| 2.7 | Create announcement | Navigate to Announcements, create | Announcement published, visible to residents | ☐ |
| 2.8 | Schedule announcement | Create with future publish date | Appears as draft, publishes at scheduled time | ☐ |
| 2.9 | Manage documents | Navigate to Documents | Upload, view, delete documents | ☐ |
| 2.10 | Invite residents | Navigate to Onboarding, send invites | Invitations sent, trackable | ☐ |
| 2.11 | View notifications | Navigate to Notifications | Notification list with read/unread status | ☐ |
| 2.12 | Configure notification channels | Navigate to Notifications → Channels | Can enable/disable channels | ☐ |
| 2.13 | Manage work orders | Navigate to Work Orders | Full lifecycle: draft → submit → approve → start → complete | ☐ |
| 2.14 | Manage meetings | Navigate to Meetings | Create meeting, add agenda, record minutes | ☐ |
| 2.15 | View action items | Navigate to Meetings → Action Items | Track action items from meetings | ☐ |
| 2.16 | Manage governance votes | Navigate to Governance | Create vote, track participation | ☐ |
| 2.17 | View org chart | Navigate to Org Chart | Representative assignments visualized | ☐ |
| 2.18 | Manage settings | Navigate to Settings | Compound settings editable | ☐ |

---

## 3. Board Member

| # | Scenario | Steps | Expected Result | Pass/Fail |
|---|----------|-------|-----------------|-----------|
| 3.1 | Login as Board Member | Navigate to `/login` | Redirected to dashboard | ☐ |
| 3.2 | View finance reports | Navigate to Finance → Reports | Financial reports visible | ☐ |
| 3.3 | View governance votes | Navigate to Governance | Active and past votes visible | ☐ |
| 3.4 | View meeting minutes | Navigate to Meetings | Meeting records accessible | ☐ |

---

## 4. Finance Reviewer

| # | Scenario | Steps | Expected Result | Pass/Fail |
|---|----------|-------|-----------------|-----------|
| 4.1 | Login as Finance Reviewer | Navigate to `/login` | Redirected to dashboard | ☐ |
| 4.2 | View dues overview | Navigate to Dues | Charges, payments, balances visible | ☐ |
| 4.3 | Review collection campaigns | Navigate to Dues → Campaigns | Campaign details, charge breakdown | ☐ |
| 4.4 | View financial reports | Navigate to Finance → Reports | Revenue, collection rate reports | ☐ |
| 4.5 | Advanced finance operations | Navigate to Finance → Advanced | Manual adjustments, overrides | ☐ |

---

## 5. Security Guard

| # | Scenario | Steps | Expected Result | Pass/Fail |
|---|----------|-------|-----------------|-----------|
| 5.1 | Login as Security Guard | Navigate to `/login` | Redirected to security dashboard | ☐ |
| 5.2 | Manage visitor manual entries | Navigate to Security → Manual Entries | Add visitor entry record | ☐ |
| 5.3 | View visitor log | Navigate to Visitors | Recent visitor entries listed | ☐ |
| 5.4 | Manage gate access | Navigate to Security → Gates | Gate status, access control | ☐ |
| 5.5 | Report security incident | Navigate to Security → Incidents | Create incident report | ☐ |
| 5.6 | View shifts | Navigate to Security → Shifts | Shift schedule visible | ☐ |
| 5.7 | Manage devices | Navigate to Security → Devices | Device registry, status | ☐ |

---

## 6. Resident Owner

| # | Scenario | Steps | Expected Result | Pass/Fail |
|---|----------|-------|-----------------|-----------|
| 6.1 | Login as Resident Owner | Navigate to `/login` | Redirected to resident dashboard | ☐ |
| 6.2 | View unit details | Navigate to Units | Unit info, building, floor | ☐ |
| 6.3 | View announcements | Check notification center | Compound announcements visible | ☐ |
| 6.4 | View dues balance | Navigate to Dues | Outstanding balance, payment history | ☐ |
| 6.5 | Submit issue report | Navigate to Issues, create | Issue created, visible to admin | ☐ |
| 6.6 | View privacy settings | Navigate to Privacy | Privacy controls accessible | ☐ |
| 6.7 | Receive realtime notification | Trigger notification from admin | Push notification received | ☐ |

---

## 7. Resident Tenant

| # | Scenario | Steps | Expected Result | Pass/Fail |
|---|----------|-------|-----------------|-----------|
| 7.1 | Login as Resident Tenant | Navigate to `/login` | Redirected to resident dashboard | ☐ |
| 7.2 | View announcements | Check notification center | Compound announcements visible | ☐ |
| 7.3 | View dues info | Navigate to Dues | Balance info visible (read-only for tenant) | ☐ |
| 7.4 | Submit issue report | Navigate to Issues, create | Issue created | ☐ |

---

## 8. Support Agent

| # | Scenario | Steps | Expected Result | Pass/Fail |
|---|----------|-------|-----------------|-----------|
| 8.1 | Login as Support Agent | Navigate to `/login` | Redirected to support dashboard | ☐ |
| 8.2 | View ops status | Navigate to System → Ops Status | Health dashboard with all checks | ☐ |
| 8.3 | Manage users | Navigate to Support → Users | List, create, update users | ☐ |
| 8.4 | Merge duplicate users | Navigate to Support → Merges | Merge wizard, conflict resolution | ☐ |
| 8.5 | View audit logs | Navigate to Audit Logs | Activity log with filters | ☐ |

---

## Sign-Off

| Reviewer | Role | Date | Approved |
|----------|------|------|----------|
| | Technical Lead | | ☐ |
| | Product Owner | | ☐ |
| | Finance Reviewer | | ☐ |
| | Security Reviewer | | ☐ |

---

## UAT Summary

- **Total test scenarios:** 50+
- **Pass rate target:** 100% for critical paths
- **Blocking issues:** Must be resolved before launch
- **Non-blocking issues:** Can be tracked as post-launch tickets
