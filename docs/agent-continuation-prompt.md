# Compound Project Agent Continuation Prompt

Use this prompt when asking any AI or local coding agent to continue work on the Compound Management platform.

```text
You are continuing work on the Compound Management platform, a long-running, production-grade owners association and compound management system. Treat this as a large-scale project intended to go from zero to production, not an MVP.

Repository:
- Local workspace: D:\apps\compound
- GitHub: https://github.com/mostafaspace/compound
- Jira board: https://mostafatorra.atlassian.net/jira/core/projects/CM/board?filter=&groupBy=status

Tech stack:
- Backend: Laravel, PHP 8.3
- Database: MySQL or MariaDB
- Realtime: Laravel Reverb first, polling fallback for non-critical screens
- Auth: Laravel Sanctum
- Queues/background jobs: Redis + Horizon
- File storage: S3-compatible object storage, local disk only if budget is tight
- Mobile app: React Native CLI
- Admin web: Next.js
- Monorepo: apps/api, apps/admin, apps/mobile, packages/*

Local Docker environment:
- Do not move the project back to XAMPP. Docker is the expected local runtime now.
- Start stack: docker compose -f infra/docker-compose.yml up -d --build
- API: http://localhost:8000
- Admin web in Docker: http://localhost:3001
- Admin host port 3000 may already be occupied by another local dev server.
- MySQL: localhost:3307
- Redis: localhost:6379
- Reverb: localhost:8080
- MinIO: http://localhost:9001
- Mailpit: http://localhost:8025
- Run backend commands inside Docker:
  - docker compose -f infra/docker-compose.yml exec -T api php artisan migrate
  - docker compose -f infra/docker-compose.yml exec -T api php artisan test
  - docker compose -f infra/docker-compose.yml exec -T api php artisan queue:failed

Core operating rules:
1. Use Jira as the project memory/brain.
2. Before coding, inspect Jira in-progress items and subtasks. Start from the highest-priority item that is already in progress unless there is a clear blocker.
3. Do not create new Jira stories if the work already exists. Search first.
4. When you choose work, tell the user what you found in Jira and what you will work on next.
5. Update Jira comments continuously with progress, blockers, commits, test results, and human QA notes.
6. Every implemented story must have matching Backend, Frontend, and QA subtasks. Update the relevant subtask as you work.
7. If implementation and validation are complete from your side, transition the story/subtask to "ReadyFor Human Test" or "Ready for human test" using the available Jira transition.
8. If Jira transition fails due to MCP permissions/auth, add a Jira comment saying it is ready, include validation evidence, and explicitly ask for manual transition.
9. Once any feature/slice is complete and validated, commit and push it before handing back to the user.
10. Keep the user informed before major edits and after meaningful validation.
11. Never treat Jira as optional. If Jira MCP is unavailable, say so and keep a local summary until Jira access returns.

Jira workflow:
- Board/project key: CM
- Start by searching:
  - project = CM AND status = "In Progress" ORDER BY key ASC
  - For a selected story, search parent/subtasks:
    - project = CM AND (parent = CM-KEY OR key = CM-KEY) ORDER BY key ASC
- Check transitions before marking ready.
- Add comments to both parent story and changed subtasks.
- A useful Jira progress comment includes:
  - What was implemented
  - Files or modules changed
  - Tests/checks run
  - Commit hash if pushed
  - Remaining blockers
  - Human QA focus
  - Whether the ticket should move to Ready for human test

User story creation rules:
- Only create stories after checking they do not already exist.
- Stories must be detailed enough for an AI agent to implement and a human to review.
- Sort stories by priority and dependency.
- This is for zero-to-production completeness, not MVP scope.
- Each user story must include exactly these three subtasks:
  1. Backend
  2. Frontend
  3. QA
- Backend subtask must include:
  - Data model/migrations
  - API endpoints and request/response contracts
  - Services/jobs/events/listeners
  - Auth/RBAC/policies
  - Audit logs
  - Notifications/realtime behavior when relevant
  - Error handling and edge cases
  - Required tests
- Frontend subtask must include:
  - Admin web screens/components/actions
  - Mobile screens/components when relevant
  - Role-aware navigation/permissions
  - Loading, empty, error, and success states
  - Realtime/polling behavior when relevant
  - Accessibility and responsive behavior
  - Required validation/typecheck/build checks
- QA subtask must include:
  - Unit tests
  - Feature/API tests
  - Integration tests
  - Browser/manual admin tests
  - Mobile device tests when relevant
  - Permission/security tests
  - Regression tests
  - Edge cases and failure modes
  - Human acceptance criteria

Coding standards:
- Follow the existing codebase patterns before inventing new ones.
- Keep changes scoped to the selected Jira story/subtask.
- Do not revert or overwrite unrelated user changes.
- Use migrations/resources/controllers/services that match the existing Laravel structure.
- Use shared contracts in packages/* for cross-app data shapes.
- Use Next.js server components/actions where the admin app already does.
- Use React Native CLI patterns already in apps/mobile.
- Prefer Reverb for realtime and polling fallback for non-critical screens.
- Include audit logging for sensitive or mutating backend operations.
- Use Sanctum auth and role checks consistently.
- Keep UI production-quality, role-aware, and responsive.

Validation expectations:
- Backend:
  - docker compose -f infra/docker-compose.yml exec -T api php artisan migrate:fresh --force
  - docker compose -f infra/docker-compose.yml exec -T api php artisan test
- Admin:
  - npm run typecheck -w apps/admin
  - npm run lint -w apps/admin
  - npm run build -w apps/admin
- Mobile:
  - npm run typecheck -w apps/mobile
  - Do not require Android/iOS device builds unless the user asks or the machine is configured for it.
- Docker:
  - docker compose -f infra/docker-compose.yml ps
  - Confirm API status returns 200.
  - Confirm admin login page returns 200.
  - Confirm no failed jobs after queue-related work.
- If a validation step cannot run, explain exactly why in Jira and in the final response.

Current known ready-for-human-test candidates as of the last handoff:
- P02 authentication/RBAC/audit foundation: CM-2, CM-22, CM-23, CM-24 were ready from implementation side after Docker validation.
- P08 visitor requests/QR/security gate: CM-8, CM-40, CM-41, CM-42 were ready from implementation side after Docker validation.
- Jira MCP transition had previously failed for CM tickets due project transition restrictions; comments were added with manual move instructions.
- Always re-check Jira because statuses may have changed after this handoff.

Recent validation evidence from last handoff:
- Docker backend PHP 8.3 was working.
- Full backend suite passed: 37 tests, 222 assertions.
- P08 visitor backend tests passed: 5 tests, 55 assertions.
- Admin typecheck/lint/build passed.
- Mobile typecheck passed.
- Docker API /api/v1/status returned 200.
- Docker admin /login returned 200 on http://localhost:3001.
- Queue failed jobs were clean.

How to continue:
1. Check Jira in-progress stories and subtasks.
2. Re-check git status and recent commits.
3. Re-run only the validation needed to trust the current baseline.
4. Pick the next highest-priority in-progress story with the fewest blockers.
5. Tell the user what you will work on next.
6. Implement the missing slice.
7. Run validation.
8. Update Jira parent and subtasks.
9. Commit and push every completed feature/slice.
10. Mark ready for human test when complete, or comment with exact blocker if not.

Final response format:
- Summarize what changed.
- List validation run and results.
- List Jira tickets updated and status/transition result.
- List commit hash if pushed.
- Mention remaining blockers or next recommended story.
```
