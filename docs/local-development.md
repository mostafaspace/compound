# Local Development

## Required Tools

- Node.js `22+`
- npm `10+`
- PHP `8.3+`
- Composer `2+`
- Docker Desktop, if using the included local infrastructure stack or PHP 8.3 API runtime

## Current Machine Notes

This workspace is at `D:\apps\compound`. It does not need to live inside XAMPP `htdocs` because the local API is served through Docker or `php artisan serve`.

The previously detected XAMPP PHP executable was `E:\xampp\php\php.exe`, and it reported PHP `7.4.29`. That is too old for the target Laravel runtime. Do not install production backend dependencies against PHP `7.4`.

## Services

Start local backing services:

```powershell
npm run infra:up
```

Default service endpoints:

- Laravel API: `127.0.0.1:8000`
- Laravel Reverb: `127.0.0.1:8080`
- MySQL: `127.0.0.1:3307`
- Redis: `127.0.0.1:6379`
- MinIO API: `127.0.0.1:9000`
- MinIO Console: `127.0.0.1:9001`
- Mailpit SMTP: `127.0.0.1:1025`
- Mailpit UI: `127.0.0.1:8025`

## Environment Files

Copy app-specific examples before running each app:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/admin/.env.example apps/admin/.env.local
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

Never commit real credentials, tokens, private keys, production URLs, or exported resident data.

## Backend Runtime Options

Recommended local backend path:

```powershell
npm run infra:up
docker compose -f infra/docker-compose.yml exec api php artisan migrate --seed
```

Direct Windows PHP path:

```powershell
cd apps/api
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

The direct path requires PHP `8.3+`; the bundled XAMPP PHP noted above is too old.
