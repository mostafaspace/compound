# Backend Operations Runbook

**Compound Management Platform — CM-127**
**Date:** 2026-04-25 | **Status:** Ready for review

---

## 1. Environment Access

| Environment | URL | Notes |
|-------------|-----|-------|
| Production API | `https://api.compound.app` | Laravel + Sanctum |
| Admin UI | `https://admin.compound.app` | Next.js 16 |
| Staging | `https://staging-api.compound.app` | Mirror of prod |
| UAT | `https://uat-api.compound.local` | Seeded persona accounts |

**SSH / Server access:**
- Access via bastion host only. Use `ssh -J bastion.compound.app app@prod-api-01`
- SSH keys stored in 1Password vault "Compound Prod" under "API Server Keys"
- Never store credentials in the repository

---

## 2. Infrastructure Components

| Component | Technology | Notes |
|-----------|-----------|-------|
| API | Laravel 11, PHP 8.3 | Running via Docker / php-fpm |
| Database | MySQL 8 | RDS-compatible; daily automated backup |
| Cache / Queue | Redis 7 | Queues: `default`, `notifications`, `exports` |
| File storage | S3-compatible | Disk: `s3` or `local` depending on `.env` |
| WebSocket / Broadcast | Laravel Reverb | Port 8080 |
| Cron | Laravel Scheduler | `php artisan schedule:run` via system cron every minute |
| Worker | Queue worker | `php artisan queue:work --queue=default,notifications,exports` |

---

## 3. Deployment Procedure

```bash
# 1. Pull latest main
git pull origin main

# 2. Install/update PHP deps
composer install --no-dev --optimize-autoloader

# 3. Run migrations
php artisan migrate --force

# 4. Clear and rebuild caches
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# 5. Restart queue workers
php artisan queue:restart

# 6. Verify health
curl -s https://api.compound.app/api/v1/status | jq .
```

---

## 4. Rollback Procedure

```bash
# 1. Revert to previous git tag
git checkout v1.x.y

# 2. Re-run steps 2–6 above

# 3. If migration rollback is needed:
php artisan migrate:rollback --step=1

# 4. Notify team in #deployments Slack channel
```

> **Critical:** Never run `migrate:rollback` on production without a DB snapshot.
> Take a snapshot first: `mysqldump compound_prod > /backups/rollback-$(date +%Y%m%d).sql`

---

## 5. Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| `SendNotificationDigestCommand` | Every 15 minutes | Batch notification digests |
| `ProcessRecurringChargesCommand` | Daily 00:01 | Apply due recurring charges |
| `ExpireResidentInvitationsCommand` | Daily 02:00 | Mark expired invitations |
| `PurgeExpiredExportPackages` | Daily 03:00 | Delete expired data export packages |
| `ProcessOverdueIssuesCommand` | Hourly | Auto-escalate overdue issues |
| `BackupDatabase` (via Spatie/backup or cron) | Daily 01:00 | Full DB + storage backup |

Verify cron is running: `crontab -l | grep artisan`

---

## 6. Queue Worker Health

```bash
# Check worker status
php artisan queue:monitor default,notifications,exports

# Retry all failed jobs
php artisan queue:retry all

# Flush failed jobs after investigation
php artisan queue:flush
```

Failed jobs are viewable in the admin UI at `/audit-logs` or via:
```bash
php artisan queue:failed
```

---

## 7. Database Backup & Restore

**Automated backups:**
- Run nightly at 01:00 UTC via cron / Laravel Backup package
- Stored in S3 bucket `compound-backups` with 30-day retention
- Alert sent to `ops@compound.app` on failure

**Manual backup:**
```bash
mysqldump -u compound_user -p compound_prod | gzip > backup-$(date +%Y%m%d-%H%M).sql.gz
```

**Restore:**
```bash
gunzip < backup-20260425-0100.sql.gz | mysql -u compound_user -p compound_prod
```

---

## 8. Log Locations

| Log | Location |
|-----|----------|
| Application | `storage/logs/laravel.log` |
| Queue worker | `storage/logs/worker.log` |
| Nginx / Caddy | `/var/log/nginx/error.log` |
| Database slow queries | `/var/log/mysql/slow.log` |
| Cron output | `/var/log/cron.log` |

Stream application logs:
```bash
tail -f storage/logs/laravel.log
```

---

## 9. Environment Variables Checklist

Before production launch, verify these are set correctly:

```
APP_ENV=production
APP_DEBUG=false          # Must be false
APP_KEY=base64:...       # 32-byte random key
APP_URL=https://api.compound.app

DB_CONNECTION=mysql
DB_HOST=...
DB_DATABASE=compound_prod
DB_USERNAME=...
DB_PASSWORD=...

REDIS_HOST=...
REDIS_PASSWORD=...

MAIL_MAILER=ses          # Not "log"
MAIL_FROM_ADDRESS=noreply@compound.app

AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=me-south-1
AWS_BUCKET=compound-prod-storage

REVERB_APP_ID=...
REVERB_APP_KEY=...
REVERB_APP_SECRET=...

SANCTUM_STATEFUL_DOMAINS=admin.compound.app
```

---

## 10. Incident Response

### Severity Levels

| Level | Definition | Response Time |
|-------|------------|---------------|
| P1 — Critical | Platform down, data loss risk | < 15 min |
| P2 — High | Core feature unavailable | < 1 hour |
| P3 — Medium | Degraded experience | < 4 hours |
| P4 — Low | Minor visual / non-blocking | Next business day |

### P1 Response Steps

1. **Alert:** Post in `#incidents` with `@here`, include timestamp and symptoms
2. **Triage:** Check `/api/v1/system/ops-status` and `/api/v1/system/launch-readiness`
3. **Isolate:** Identify component (DB / Redis / queue / app)
4. **Restore:** Follow relevant section above
5. **Communicate:** Update `#incidents` every 15 min; notify stakeholders via email
6. **Post-mortem:** Document within 48 hours in `docs/incidents/`

### Escalation Contacts

| Role | Contact |
|------|---------|
| On-call engineer | See PagerDuty / on-call rota |
| Technical lead | tech-lead@compound.app |
| Product owner | product@compound.app |
| Database admin | dba@compound.app |

---

## 11. Data Import Confirmation

Before production launch, verify:

- [ ] All unit data imported via `/api/v1/imports` (type: `units`)
- [ ] All resident accounts created or invited
- [ ] Opening balances entered for all unit accounts
- [ ] Charge types configured per compound
- [ ] Document types configured
- [ ] Localization settings configured per compound

Run the import-status check:
```bash
php artisan compound:check-imports --env=production
```

---

## 12. Support Process

1. Users report issues via `support@compound.app` or in-app support ticket
2. Support agent triages using the admin console (`/support/users`)
3. P1/P2 bugs escalate to engineering immediately
4. P3/P4 bugs logged in Jira under "CM" project
5. SLA: P1 < 4h resolution, P2 < 1 business day, P3 < 1 week
