# Compound Management Platform

Production-grade monorepo for the Owners Association / Compound Management platform.

## Apps

- `apps/api`: Laravel API, Sanctum auth, MySQL/MariaDB persistence, Redis queues/Horizon, Laravel Reverb, storage adapters.
- `apps/admin`: Next.js admin web app for compound operations, finance, governance, support, and reporting.
- `apps/mobile`: React Native resident/security app.

## Shared Packages

- `packages/contracts`: API route names, DTO schemas, shared enums, and test fixtures used by web, mobile, and API tests.
- `packages/typescript-config`: Shared TypeScript compiler settings.

## Local Runtime

This repository is under `E:\xampp\htdocs\compound`, but the bundled XAMPP PHP currently reports `7.4.29`. The backend targets modern Laravel on PHP `8.3+`. Use one of these before installing backend dependencies:

1. Upgrade XAMPP PHP to `8.3+`.
2. Install a separate PHP `8.3+` CLI and put it on `PATH`.
3. Use Docker for the API runtime.

The local infrastructure stack is defined in `infra/docker-compose.yml` for the PHP API runtime, Horizon, Reverb, MySQL, Redis, MinIO, and Mailpit.

## First Commands

```powershell
npm install
npm run infra:up
npm run dev:admin
npm run dev:mobile
```

When Docker Desktop is running, the API is available at `http://localhost:8000` and Reverb at `http://localhost:8080`.

If you prefer running the backend directly from XAMPP/Windows instead of Docker, install PHP `8.3+` and Composer, then run:

```powershell
cd apps/api
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve
```
