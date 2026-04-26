# Training Guide

**Compound Management Platform — CM-128**
**Date:** 2026-04-25 | **Audience:** Admins, Finance, Security, Residents

---

## Part 1: Admin Training

### 1.1 Getting Started

**Sign in:**
1. Go to `https://admin.compound.app`
2. Enter your admin email and password
3. You will be taken to the Dashboard

**Dashboard overview:**
- **Top cards:** Pending verifications, visitor passes today, failed jobs, active compound
- **Quick links:** Review queue, System status, Settings
- **Navigation sidebar:** All modules are accessible from the left menu

---

### 1.2 Compound Setup

A compound must be created and configured before residents can be onboarded.

**Steps:**
1. Go to **Compounds → New**
2. Fill in: Name, Legal Name, Code, Timezone, Currency
3. Click **Create**
4. Open the compound and check the **Onboarding Checklist**
5. Complete each checklist item:
   - Add buildings and floors
   - Configure charge types
   - Set visitor rules (Settings → Visitors)
   - Configure document requirements (Settings → Documents)

---

### 1.3 Resident Onboarding

**Invite a resident:**
1. Go to **Invitations → New**
2. Select the unit and role (Owner or Tenant)
3. Enter the resident's email
4. Click **Send Invitation**
5. The resident receives an email with a link to complete their account

**After invitation acceptance:**
- Resident appears in unit membership list
- If documents are required: review uploaded documents in **Documents** section
- Verify identity documents and approve/reject in **Verification Requests**

---

### 1.4 Settings Configuration

Key settings per namespace:

| Namespace | Important Settings |
|-----------|-------------------|
| Documents | `require_upload_for_onboarding`, `allowed_extensions` |
| Visitors | `max_visitors_per_unit_per_day`, `require_pre_approval` |
| Issues | `auto_escalate_after_hours`, `notify_board_on_escalation` |
| Finance | `late_fee_enabled`, `grace_period_days`, `currency` |
| Governance | `default_eligibility` (owners_only vs all_verified) |
| Notifications | `email_enabled`, `sms_enabled`, `push_enabled` |
| Localization | `locale`, `timezone`, `date_format` |

Always add a **reason** when saving settings — this appears in the audit log.

---

### 1.5 Announcements

1. Go to **Announcements → New**
2. Select category: general / maintenance / finance / events / **urgent**
3. Add title and body (supports Arabic text)
4. Optionally attach files
5. Click **Publish** — residents see it immediately on their feed
6. For urgent: residents are notified via email/push

---

### 1.6 Issue Management

**Viewing issues:**
- Issues are listed at **Issues** with filters: status, category, assigned
- Each issue shows a timeline of comments and status changes

**Escalating:**
- An issue overdue beyond `auto_escalate_after_hours` is auto-escalated
- Board is notified if `notify_board_on_escalation = true`
- Manual escalation: open issue → click **Escalate**

---

## Part 2: Finance Team Training

### 2.1 Unit Accounts

Each unit has one account. Opening balance must be entered at setup.

**Creating ledger entries:**
1. Go to **Finance → Unit Accounts → {unit}**
2. Click **Add Ledger Entry**
3. Choose type (charge or payment), amount, description

---

### 2.2 Payment Submission Review

When a resident submits a manual payment (bank transfer, cash):

1. Go to **Finance → Payments**
2. Open the pending submission
3. Review: amount, reference, attachments
4. Click **Approve** or **Reject** (with reason)

---

### 2.3 Reports

| Report | Location | Use |
|--------|----------|-----|
| Collection Summary | Finance → Reports → Summary | Total collected vs outstanding |
| Account Balances | Finance → Reports → Accounts | Per-unit balance list |
| Payment Methods | Finance → Reports → Payment Methods | Cash vs bank vs check breakdown |

---

### 2.4 Budget Management

1. Go to **Finance → Budgets → New**
2. Enter year, total amount, add categories
3. Click **Activate** when ready for use
4. Track actual vs budgeted at end of period

---

## Part 3: Security Staff Training

### 3.1 Visitor Validation

At the gate:
1. Ask the visitor for their pass code (shown in the resident's app)
2. In the security console: navigate to **Visitor Pass Validate**
3. Enter the pass code
4. If valid: click **Allow** → visitor is logged in
5. If invalid: click **Deny** with reason

---

### 3.2 Manual Entry

For unexpected visitors without a pre-approved pass:
1. Go to **Security → Manual Entries → New**
2. Enter visitor name, national ID, unit number, purpose
3. This creates an audit record for every manual entry

---

### 3.3 Incident Reporting

1. Navigate to **Security → Incidents → New**
2. Select type: access_breach / equipment_failure / suspicious_activity / noise_complaint / fire_alarm / other
3. Describe the incident; set severity: info / low / medium / high / critical
4. Save — the incident is visible to all admin roles
5. Admin will resolve and add resolution notes

---

### 3.4 Shift Check-In / Check-Out

1. Find your assigned shift under **Security → Shifts**
2. Click **Check In** at the start of your shift
3. Click **Check Out** when your shift ends
4. Do not leave without checking out — this affects coverage records

---

## Part 4: Resident Quick Start

### 4.1 First Login

1. Open the invitation email from your property management
2. Click **Complete Your Account** and create a password
3. Log in to the resident portal

### 4.2 Visitor Requests

1. Go to **My Visitors → New Request**
2. Enter: visitor name, date, number of guests, purpose
3. Your visitor will receive a pass code (valid for 24 hours by default)
4. Share the pass code with your visitor

### 4.3 Submitting Issues

1. Go to **My Issues → New Issue**
2. Select category: maintenance / noise / security / cleanliness / other
3. Describe the problem and optionally upload photos
4. Track status: submitted → in_review → resolved

### 4.4 Finance

1. Go to **My Account** to see your current balance
2. To submit a payment: click **Submit Payment**, enter amount and upload receipt
3. Payments are reviewed and approved by the finance team

### 4.5 Privacy

1. Go to **My Privacy** to review consents
2. You can accept Privacy Policy and Terms of Service
3. To request a copy of your data: click **Request Data Export**
4. Your data export will be ready within 7 days

---

## Frequently Asked Questions

**Q: What do I do if I forget my password?**
A: Use the "Forgot Password" link on the login page. An email with a reset link will be sent.

**Q: Can I use the platform in Arabic?**
A: Yes. The platform supports both English and Arabic. Use the language toggle in the top navigation.

**Q: I uploaded my documents but they haven't been reviewed yet.**
A: Verification typically takes 1–3 business days. You'll receive a notification when reviewed.

**Q: Can I cancel a visitor request?**
A: Yes, up to 1 hour before the visit. Go to My Visitors and click Cancel.

**Q: I received an invoice but I've already paid.**
A: Submit your payment with the bank transfer reference. The finance team will reconcile within 2 business days.
