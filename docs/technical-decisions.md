# Technical Decisions

## 2026-04-19: Monorepo Package Manager

Use npm workspaces because Node.js and npm are already available on the machine, while pnpm is not installed. This keeps setup simple and avoids adding another required package manager at the start.

## 2026-04-19: Backend Runtime

Target Laravel 13 with PHP 8.3+. The XAMPP PHP binary currently reports PHP 7.4.29, so backend dependencies must be installed through an upgraded PHP CLI, Docker, or a refreshed XAMPP runtime.

## 2026-04-19: Mobile Runtime

Use Expo on React Native unless the project later needs custom native modules that make a bare React Native workflow more appropriate. Expo keeps QR scanning, push notifications, staged builds, and store release operations faster to implement.

## 2026-04-19: Local Backing Services

Use Docker Compose for the PHP 8.3 API runtime, Horizon, Reverb, MySQL, Redis, MinIO, and Mailpit. The app does not need to live under XAMPP `htdocs`; backend execution and backing services should be reproducible and isolated from older local PHP versions.
