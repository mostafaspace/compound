# Role-Based Access Control & Feature Matrix

This document outlines the current and proposed access levels for each user role in the mobile application, ensuring clear boundaries between residents, administrators, and security personnel.

## 1. Role Matrix & Action Rights

| Role Type | Primary Function | Core Screens | Key Actions |
| :--- | :--- | :--- | :--- |
| **Admin** | Compound Management | Dashboard, Visitors Log, Finance, Units, More | Approve/Reject Payments, View Audit Logs, Manage Units, Broadcast Announcements |
| **Resident** | Personal Property | Dashboard, Visitor QR, Finance, Polls, More | **Create Visitor QR**, Submit Payments, Vote on Polls, Report Issues |
| **Security** | Gate Operations | QR Scanner, Entry History | Validate Visitor Passes, Log Manual Entry |

> [!IMPORTANT]
> **Admin Change**: Administrators can no longer create visitor invitations for themselves. Their "Visitor QR" screen is now a pure log/history view for the entire compound.

---

## 2. Seed Users for Testing (UAT Personas)

Use these accounts to test the different role-based layouts and permissions. The password for all accounts is `password`.

| Name | Role | Email | Best For Testing |
| :--- | :--- | :--- | :--- |
| **UAT Compound Admin** | `compound_admin` | `uat-compound-admin@compound.local` | Finance approvals, unit management. |
| **UAT Resident Owner** | `resident_owner` | `uat-resident-owner@compound.local` | Visitor creation, paying dues, voting. |
| **UAT Security Guard** | `security_guard` | `uat-security-guard@compound.local` | QR Scanning and gate logs. |
| **UAT Finance Reviewer** | `finance_reviewer` | `uat-finance-reviewer@compound.local` | Specialized finance review screens. |
| **UAT Super Admin** | `super_admin` | `uat-super-admin@compound.local` | Platform-wide settings and multi-compound access. |

---

## 3. Administrative Parity Plan (Mobile)

To bring the mobile experience to parity with the Web Admin dashboard, we will implement the following high-priority screens:

### A. Resident Invitations Management
*   **Goal**: Allow admins to send invitations to new residents directly from mobile.
*   **Action**: "Invite Resident" button with unit selection and role assignment.

### B. Maintenance Issue Board
*   **Goal**: A centralized view of all reported issues from residents.
*   **Action**: Change issue status (e.g., Pending -> In Progress -> Resolved).

### C. Announcement Broadcast Center
*   **Goal**: Enable admins to send push notifications and app announcements.
*   **Action**: Create, Edit, and Publish announcements compound-wide.

### D. Audit Log Explorer
*   **Goal**: Security and transparency.
*   **Action**: View a timeline of critical system events (logins, role changes, finance approvals).

---

## 4. Next Steps for Review
1. **Confirmation**: Do you agree with removing the 'Create Visitor' action for Admins?
2. **Prioritization**: Which of the Admin Parity screens (Invitations, Issues, Announcements, Audit Logs) would you like me to build first?
