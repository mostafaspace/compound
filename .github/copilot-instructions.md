# Compound Project Copilot Instructions

## 1. Project Overview
**Compound Management Platform** is a production-grade owners association and compound management system. It serves residents, owners, and compound staff to manage units, issues, payments, and communications. The platform consists of a Laravel API, a Next.js Admin Dashboard, and a React Native Mobile Application.

## 2. Tech Stack
- **Backend:** Laravel (PHP 8.3), MySQL/MariaDB, Laravel Reverb (Realtime), Sanctum (Auth), Redis + Horizon (Queues/Jobs).
- **Admin Web:** Next.js (App Router), TailwindCSS, React.
- **Mobile App:** React Native CLI (v0.74+).
- **Shared Packages:** Shared TypeScript contracts and utilities in `packages/`.
- **Infrastructure:** Docker-based local development using `infra/`.

## 3. Coding Guidelines
- **Surgical Changes:** Always make highly targeted edits. Do not refactor or remove working code unless explicitly requested by a user story.
- **Zero Defect Tolerance:** No console errors, build errors, or dead links. Every change must be tested and validated.
- **Bilingual (Arabic & English):** All user-facing features must support both AR and EN, including RTL support for Arabic. No English-only features are allowed.
- **Jira-Driven Development:** Jira (Project: `CM`) is the source of truth. Always check `project = CM` for user stories and subtasks before coding.
- **Direct to Main:** Work directly on the `main` branch. No feature branches or worktrees.
- **Professionalism:** Write clean, production-ready code. No placeholders, "TODOs", or "MVP" shortcuts.

## 4. Project Structure
- `apps/api/`: Laravel backend application.
- `apps/admin/`: Next.js administrative dashboard.
- `apps/mobile/`: React Native mobile application.
- `packages/`: Shared logic, types, and utilities.
- `infra/`: Docker configuration and local environment setup.
- `docs/`: Documentation and project guides.
- `scripts/`: Development and maintenance scripts.

## 5. Resources & Tools
- **Jira MCP:** Use `mcp-atlassian` tools to manage tasks and report progress.
- **Playwright MCP:** Use for UI testing and navigation verification.
- **Backend Testing:** `docker compose -f infra/docker-compose.yml exec -T api php artisan test`
- **Frontend Validation:** 
  - `npm run typecheck -w apps/admin`
  - `npm run lint -w apps/admin`
  - `npm run typecheck -w apps/mobile`
- **Jira Workflow:** Always update subtasks (Backend/Frontend/QA) with evidence before moving the parent ticket to "Ready For Human Test" or "Done".
