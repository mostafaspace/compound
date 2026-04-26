# Launch Day Checklist

**Compound Management Platform — CM-128 / CM-129**
**Date:** 2026-04-26 | **Owner:** Technical Lead + Product Owner

---

## Pre-Launch Gate (T-7 days)

### Environment
- [ ] `APP_ENV=production`, `APP_DEBUG=false` confirmed on production server
- [ ] All environment variables from runbook Section 9 set and verified
- [ ] SSL certificates valid and auto-renewal configured
- [ ] DNS records pointing to production server
- [ ] Firewall rules reviewed; only 80, 443, 8080 (Reverb) open externally

### Infrastructure
- [ ] Database backup verified and restorable (test restore on staging)
- [ ] Redis connection stable; `redis-cli ping` returns PONG
- [ ] Queue workers running with supervisor/systemd
- [ ] Cron job running (`php artisan schedule:run` every minute)
- [ ] Storage disk writable; `.compound-healthcheck` file present
- [ ] Reverb broadcasting server running

### Application
- [ ] `/api/v1/system/launch-readiness` returns `"overall": "ready"`
- [ ] `/api/v1/status` returns `"status": "ok"`
- [ ] All migrations applied; `php artisan migrate:status` shows no pending
- [ ] Config/route/view caches rebuilt
- [ ] No failed jobs in queue (`php artisan queue:failed`)

### Data
- [ ] All unit data imported and verified
- [ ] Opening balances entered for all unit accounts
- [ ] Charge types configured per compound
- [ ] Document types configured
- [ ] Localization settings configured (locale, timezone, currency, date_format)
- [ ] At least one compound_admin account created and tested
- [ ] UAT seeder not loaded on production (UAT emails must not exist)

### UAT Sign-off
- [ ] All 8 persona UAT scenarios completed on staging
- [ ] All sign-offs captured in `docs/launch/uat-scenarios.md`
- [ ] Zero P1/P2 bugs outstanding
- [ ] Training materials distributed to all operator roles

---

## Launch Day (T-0)

### T-3 hours: Final checks
- [ ] Confirm production DB snapshot taken
- [ ] Re-run `/api/v1/system/launch-readiness` — must be `"ready"`
- [ ] Notify all admins and security staff: go-live at [TIME]
- [ ] Support team on standby

### T-1 hour: Pilot batch
- [ ] Send invitations to pilot group: Building A, Floor 1 (15–20 residents)
- [ ] Monitor invitation delivery in `/notifications/channels` delivery logs
- [ ] Confirm at least one pilot resident successfully logs in and completes onboarding

### T-0: Production open
- [ ] Enable access for all remaining residents (send invitation batch)
- [ ] Post announcement: "Welcome to Compound Management" (category: general)
- [ ] Monitor error logs: `tail -f storage/logs/laravel.log`
- [ ] Monitor queue: `php artisan queue:monitor default,notifications,exports`
- [ ] Check `/api/v1/system/ops-status` every 15 minutes for first 2 hours

### T+1 hour: Health check
- [ ] No P1/P2 bugs reported
- [ ] Notification delivery success rate > 95%
- [ ] No failed jobs in queue
- [ ] Database CPU < 70%, Response time < 300ms
- [ ] Confirm pilot residents can: log in, view announcements, submit issues

---

## Rollback Procedure

If a P1 issue is detected within the first 2 hours:

1. **Announce** in `#incidents`: "Initiating rollback — [reason]"
2. **Disable new invitations**: set `DB_SEED_INVITATIONS=false` or pause invitation job
3. **Revert API**: `git checkout v{previous-tag}` and redeploy
4. **Revert migrations** if needed: `php artisan migrate:rollback --step=N`
5. **Communicate** to residents: "We're experiencing technical issues. Access will be restored shortly. We apologize for the inconvenience."
6. **Do NOT delete any user data** during rollback
7. **Post-mortem** within 24 hours

**Rollback communication template:**
```
Subject: Temporary Service Interruption — Compound Management Platform

Dear Residents and Staff,

We are currently experiencing a technical issue that requires us to temporarily 
suspend access to the platform. Our team is working to resolve this as quickly 
as possible. We expect to restore service within [X] hours.

We apologize for any inconvenience. You will receive a notification as soon as 
the platform is back online.

— The Compound Management Team
```

---

## Pilot Rollout Plan

### Wave 1 (Day 1): Technical validation
- 1 building, 1–2 floors, 20–30 residents
- All roles represented: compound_admin, resident_owner, security_guard
- Success criteria:
  - Zero data-loss incidents
  - All core workflows complete without errors
  - Notification delivery > 95%

### Wave 2 (Day 3–5): Operational validation
- Full Building A (all floors)
- Finance team using payment submission review
- Success criteria:
  - First payment cycle processed correctly
  - Security gate validation used successfully
  - No P1/P2 bugs in 48 hours

### Wave 3 (Day 7): Full rollout
- All remaining buildings / compounds
- All resident invitations sent
- Success criteria:
  - 80%+ of invited residents onboard within 7 days
  - Audit log shows consistent usage patterns

---

## Support Contacts

| Role | Name | Contact |
|------|------|---------|
| Technical Lead | TBD | tech-lead@compound.app |
| Product Owner | TBD | product@compound.app |
| On-call Engineer | TBD | See PagerDuty |
| DB Administrator | TBD | dba@compound.app |
| Support Lead | TBD | support@compound.app |

**Escalation path:** Support Agent → Support Lead → Compound Admin → Technical Lead → Product Owner

---

## Post-Launch (T+7 days)

- [ ] Review all audit logs for anomalies
- [ ] Count: active users, issues submitted, payments processed
- [ ] Review failed notification deliveries
- [ ] Hold post-launch retrospective with all operators
- [ ] File post-launch report in `docs/incidents/post-launch-report-YYYY-MM-DD.md`
