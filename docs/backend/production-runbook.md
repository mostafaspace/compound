# Production Runbook

## Scope

This runbook covers backend operational readiness for the Compound platform: API health checks, queues, Redis, Reverb, storage, backups, restores, and launch smoke checks.

## Service Checklist

- API container running
- Horizon running
- Reverb running
- MySQL healthy
- Redis healthy
- Object storage healthy
- Admin web reachable
- Mailpit or production mail transport configured

Docker quick check:

```powershell
docker compose -f infra/docker-compose.yml ps
```

## Health Checks

Public API status:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8000/api/v1/status
```

Operator API status for authenticated `super_admin`, `compound_admin`, or `support_agent`:

```text
GET /api/v1/system/ops-status
```

The operator payload reports:

- database connectivity and latency
- Redis connectivity and latency
- queue failed job count
- storage disk reachability
- broadcast driver configuration
- warnings such as failed jobs or `APP_DEBUG` being enabled

For the local Docker stack, `infra/docker-compose.yml` provisions the `compound-local` MinIO bucket through the one-shot `minio-init` service. If storage remains degraded, check `docker compose -f infra/docker-compose.yml logs minio-init` and confirm that the bucket exists before debugging the application layer.

## Queue And Realtime Operations

Check failed jobs:

```powershell
docker compose -f infra/docker-compose.yml exec -T api php artisan queue:failed
```

Retry failed jobs after the root cause is fixed:

```powershell
docker compose -f infra/docker-compose.yml exec -T api php artisan queue:retry all
```

Flush failed jobs only after review:

```powershell
docker compose -f infra/docker-compose.yml exec -T api php artisan queue:flush
```

Restart workers after deployment or event serialization changes:

```powershell
docker compose -f infra/docker-compose.yml restart horizon
docker compose -f infra/docker-compose.yml restart reverb
docker compose -f infra/docker-compose.yml restart api
```

## Database Backup

Create a database dump from Docker:

```powershell
docker compose -f infra/docker-compose.yml exec -T mysql sh -lc "mysqldump -ucompound -pcompound_secret compound" > .\backups\compound-$(Get-Date -Format yyyyMMdd-HHmmss).sql
```

Minimum backup policy:

- database dump before every production deployment
- scheduled daily dump retention according to data policy
- separate backup retention for uploaded files/object storage

## Database Restore

Restore a dump:

```powershell
Get-Content .\backups\compound-YYYYMMDD-HHMMSS.sql | docker compose -f infra/docker-compose.yml exec -T mysql sh -lc "mysql -ucompound -pcompound_secret compound"
```

After restore:

1. run API status check
2. verify queue worker startup
3. confirm a resident login works
4. confirm at least one file download path works

## Object Storage Backup

For local MinIO, back up the bucket contents from the mounted volume or through an S3-compatible sync tool. Production storage should use provider-native versioning and lifecycle rules where budget allows.

At minimum:

- snapshot the object bucket before destructive maintenance
- preserve legal/compliance document retention separately from transient uploads
- verify restored file keys still match database references

## Deployment Smoke Test

Run this minimum smoke path after deployment:

1. invite acceptance
2. verification review decision
3. visitor QR creation and validation
4. issue submission and admin status update
5. announcement publish and resident acknowledgement
6. finance charge, payment submission, and approval
7. governance vote activation and resident cast flow
8. notification delivery and unread count update

## Launch Blocking Conditions

Do not sign off launch while any of these remain true:

- queue failed jobs are accumulating
- operator status endpoint reports degraded database, Redis, or storage
- `APP_DEBUG=true` in production
- no current database backup exists
- restore procedure has not been tested
- Reverb/Horizon restart steps are undocumented for the target environment
- Arabic/English parity is incomplete on touched release screens
