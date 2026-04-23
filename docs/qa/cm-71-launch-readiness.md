# CM-71 Frontend Launch Readiness

Use this checklist before moving CM-71 to Ready For Human Test.

## Admin Web

1. Switch the admin app to English and verify `/documents` and `/onboarding` render without clipped text, overlapping actions, or broken table layout.
2. Switch the admin app to Arabic and verify the same two pages render in RTL with readable banners, buttons, tables, and filter controls.
3. Disconnect the API or point the admin app at an unavailable API and verify `/documents` shows the degraded-state warning instead of silently appearing empty.
4. Repeat the degraded-state check for `/onboarding` and confirm both verification and invitation warnings appear when the API is unavailable.
5. Trigger a document upload failure and confirm the user sees the localized failure banner after redirect.
6. Trigger a document review failure and confirm the localized failure banner appears after redirect.
7. Trigger invitation resend, revoke, approve, reject, and more-info failures and confirm each action returns to `/onboarding` with the correct localized error banner.
8. Trigger successful document upload and review actions and confirm the localized success banners appear.
9. Trigger successful invitation resend, revoke, approve, reject, and more-info actions and confirm the existing localized success banners still appear.
10. Force a route-level render failure in the admin app and confirm the route error boundary offers Retry plus Return to dashboard.
11. Force a global app failure and confirm the global error surface renders in the current locale direction with retry and dashboard recovery actions.

## Build Validation

1. Run `npm run typecheck -w apps/admin`.
2. Run `npm run lint -w apps/admin`.
3. Run `npm run build -w apps/admin`.

## Human Sign-Off Notes

- English and Arabic parity must be confirmed together; do not sign off from one locale only.
- Degraded-state banners must be treated as operator guidance, not cosmetic messaging.
- CM-71 should stay In Progress until the admin checks above and the remaining mobile/release readiness items are completed.
