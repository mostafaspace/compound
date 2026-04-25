# CM-86 Launch Readiness Checklist

> **Purpose:** Verify all systems are ready before opening production to residents.
> **Pre-requisite:** All P01-P31 stories completed and in Done.

---

## 1. Infrastructure Readiness

| # | Check | Command / Method | Status |
|---|-------|------------------|--------|
| 1.1 | All Docker services healthy | `docker compose ps` — 8 services healthy | ☐ |
| 1.2 | Database connection verified | `docker compose exec api php artisan db:show` | ☐ |
| 1.3 | Redis connection verified | `docker compose exec redis redis-cli ping` | ☐ |
| 1.4 | Queue worker running | `docker compose exec api php artisan queue:status` | ☐ |
| 1.5 | Storage disk accessible | `docker compose exec api php artisan tinker` → `Storage::list('/')` | ☐ |
| 1.6 | Broadcasting (Reverb) connected | Check `/api/v1/system/ops-status` broadcasting check | ☐ |
| 1.7 | Notification channels configured | Check ops-status notifications check | ☐ |
| 1.8 | Scheduled jobs runnable | `docker compose exec api php artisan schedule:list` | ☐ |
| 1.9 | SSL/TLS certificates valid | `openssl s_client -connect domain:443` | ☐ |
| 1.10 | DNS resolves correctly | `dig compound.domain.com` | ☐ |

---

## 2. Application Readiness

| # | Check | Method | Status |
|---|-------|--------|--------|
| 2.1 | Public status endpoint returns 200 | `curl https://domain/api/v1/status` | ☐ |
| 2.2 | Ops status endpoint returns ok | Authenticated `GET /api/v1/system/ops-status` | ☐ |
| 2.3 | All 420 backend tests pass | `php artisan test` | ☐ |
| 2.4 | Admin app builds successfully | `cd apps/admin && npm run build` | ☐ |
| 2.5 | Admin typecheck passes | `npm run typecheck` | ☐ |
| 2.6 | Admin lint passes | `npm run lint` | ☐ |
| 2.7 | Mobile app builds | `cd apps/mobile && npx expo build:ios` / `:android` | ☐ |
| 2.8 | UAT persona accounts seeded | `php artisan db:seed --class=UatPersonaSeeder` | ☐ |
| 2.9 | Baseline data seeded (charge types, document types) | `php artisan db:seed` | ☐ |
| 2.10 | APP_DEBUG is disabled in production | `.env.production` check | ☐ |

---

## 3. Data Readiness

| # | Check | Method | Status |
|---|-------|--------|--------|
| 3.1 | Compound data imported | Verify compounds table has production data | ☐ |
| 3.2 | Building/unit data imported | Verify units count matches expected | ☐ |
| 3.3 | Resident accounts created | Verify user count for compound | ☐ |
| 3.4 | Charge types configured | Verify 9 baseline charge types exist | ☐ |
| 3.5 | Document types configured | Verify 4 document types exist | ☐ |
| 3.6 | Notification templates exist | Verify notification_templates table | ☐ |
| 3.7 | No orphaned records | Run integrity checks | ☐ |

---

## 4. Security & Compliance

| # | Check | Method | Status |
|---|-------|--------|--------|
| 4.1 | Passwords hashed | Verify `password` column uses bcrypt | ☐ |
| 4.2 | Sanctum tokens configured | Check `sanctum` config | ☐ |
| 4.3 | CORS configured for production domains | Check `cors.php` | ☐ |
| 4.4 | Rate limiting active | Verify API rate limiter middleware | ☐ |
| 4.5 | Audit logging enabled | Check audit_logs table has entries | ☐ |
| 4.6 | PII data encrypted at rest | Verify sensitive columns encrypted | ☐ |
| 4.7 | Backup encryption configured | Verify backup encryption key set | ☐ |
| 4.8 | Access control policies enforced | Verify role-based access works | ☐ |

---

## 5. Monitoring & Observability

| # | Check | Method | Status |
|---|-------|--------|--------|
| 5.1 | Error logging configured | Check `logging` config, test error | ☐ |
| 5.2 | Queue failure alerts configured | Check failed_jobs monitoring | ☐ |
| 5.3 | Health check endpoint accessible | External monitoring can reach `/api/v1/status` | ☐ |
| 5.4 | Log rotation configured | Check log file sizes, rotation policy | ☐ |
| 5.5 | Backup schedule verified | Verify scheduled backup job | ☐ |

---

## 6. Communication & Support

| # | Check | Method | Status |
|---|-------|--------|--------|
| 6.1 | Support contacts documented | See runbook § Support Contacts | ☐ |
| 6.2 | Escalation path defined | See runbook § Escalation | ☐ |
| 6.3 | Rollback procedure tested | See runbook § Rollback | ☐ |
| 6.4 | Launch day communication drafted | Email/announcement to residents | ☐ |
| 6.5 | Training materials available | See training docs | ☐ |
| 6.6 | UAT sign-off captured | See UAT checklist sign-off | ☐ |

---

## Launch Day Runbook

### Pre-Launch (T-24h)
1. [ ] Final database backup
2. [ ] Verify all services healthy via ops-status
3. [ ] Confirm no failed jobs in queue
4. [ ] Send launch announcement to compound admins

### Launch (T=0)
1. [ ] Set APP_DEBUG=false
2. [ ] Run `php artisan cache:clear && php artisan config:cache && php artisan route:cache`
3. [ ] Restart all services: `docker compose up -d`
4. [ ] Verify ops-status returns ok
5. [ ] Smoke test: login as admin, verify dashboard loads
6. [ ] Smoke test: send test notification

### Post-Launch (T+1h)
1. [ ] Monitor error logs for 1 hour
2. [ ] Check queue processing
3. [ ] Verify notification delivery
4. [ ] Confirm no user-reported issues

### Post-Launch (T+24h)
1. [ ] Review error log summary
2. [ ] Check queue failure rate
3. [ ] Gather initial user feedback
4. [ ] Update incident log if needed

---

## Rollback Procedure

| Trigger | Action |
|---------|--------|
| Critical bug affecting >10% of users | Immediate rollback to previous deployment |
| Database migration failure | Rollback migration, restore from backup |
| Service outage >15 min | Rollback, switch to maintenance page |
| Security incident | Isolate affected services, activate incident response |

**Rollback Command:**
```bash
# Revert to previous commit
git checkout <previous-commit>
docker compose down
docker compose up -d --build
php artisan migrate:rollback
```

---

## Launch Approval

| Role | Name | Approved | Date |
|------|------|----------|------|
| Technical Lead | | ☐ | |
| Product Owner | | ☐ | |
| Finance Reviewer | | ☐ | |
| Security Reviewer | | ☐ | |
| Operations Lead | | ☐ | |
