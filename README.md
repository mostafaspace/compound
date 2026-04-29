# Compound Management Platform

Production-grade monorepo for the Owners Association / Compound Management platform.

## AI Agent Instructions & Governance
This project now uses a canonical documentation model for project truth.

- **Start Here:** [docs/canon/README.md](docs/canon/README.md)
- **Agent Guide:** [docs/canon/agent-operator-guide.md](docs/canon/agent-operator-guide.md)
- **Legacy Pointers:** [system-instructions.md](docs/system-instructions.md) and [local-ai-agent-prompt.md](docs/local-ai-agent-prompt.md) now defer to canon.
- **Jira Integration:** Jira is the execution and evidence layer, not the source of truth. Active work should still be aligned with [Project CM](https://mostafatorra.atlassian.net/jira/core/projects/CM/).

## Apps

- `apps/api`: Laravel API, Sanctum auth, MySQL/MariaDB persistence, Redis queues/Horizon, Laravel Reverb, storage adapters.
- `apps/admin`: Next.js admin web app for compound operations, finance, governance, support, and reporting.
- `apps/mobile`: React Native resident/security app.

## Shared Packages

- `packages/contracts`: API route names, DTO schemas, shared enums, and test fixtures used by web, mobile, and API tests.
- `packages/typescript-config`: Shared TypeScript compiler settings.

## Local Runtime

This repository is under `D:\apps\compound`. It does not need to live inside XAMPP `htdocs`; the backend is served through Docker or a PHP `8.3+` CLI runtime. Use one of these before installing backend dependencies:

1. Use Docker for the API runtime.
2. Install a separate PHP `8.3+` CLI and put it on `PATH`.
3. Upgrade XAMPP PHP to `8.3+` only if you still prefer using XAMPP's PHP binary directly.

The local infrastructure stack is defined in `infra/docker-compose.yml` for the PHP API runtime, Horizon, Reverb, MySQL, Redis, MinIO, and Mailpit.

## First Commands

```powershell
npm install
npm run infra:up
npm run dev:admin
npm run dev:mobile
```

When Docker Desktop is running, the API is available at `http://localhost:8000` and Reverb at `http://localhost:8080`.

If you prefer running the backend directly from Windows instead of Docker, install PHP `8.3+` and Composer, then run:

```powershell
cd apps/api
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve
```
