# CM-71 Frontend Launch Readiness

Use this checklist before moving CM-71 to Ready For Human Test.

## Admin Web — Documents & Onboarding

1. Switch the admin app to English and verify `/documents` and `/onboarding` render without clipped text, overlapping actions, or broken table layout.
2. Switch the admin app to Arabic and verify the same two pages render in RTL with readable banners, buttons, tables, and filter controls.
3. Disconnect the API or point the admin app at an unavailable API and verify `/documents` shows the degraded-state warning instead of silently appearing empty.
4. Repeat the degraded-state check for `/onboarding` and confirm both verification and invitation warnings appear when the API is unavailable.
5. Trigger a document upload failure and confirm the user sees the localized failure banner after redirect.
6. Trigger a document review failure and confirm the localized failure banner appears after redirect.
7. Trigger invitation resend, revoke, approve, reject, and more-info failures and confirm each action returns to `/onboarding` with the correct localized error banner.
8. Trigger successful document upload and review actions and confirm the localized success banners appear.
9. Trigger successful invitation resend, revoke, approve, reject, and more-info actions and confirm the existing localized success banners still appear.

## Admin Web — Finance

10. Open `/finance` in English; verify accounts table, payment submissions section, and filter tabs render correctly.
11. Switch to Arabic and verify the same page renders in RTL without layout breakage.
12. When no accounts exist (fresh compound), verify the "No finance accounts" empty state appears.
13. When no payments match the active status filter, verify the "No payments match" empty state appears.
14. Simulate API degradation with zero accounts and zero payments; verify the Finance degraded-state banner appears (amber, titled).
15. Approve, reject, and request-correction actions must each redirect back to `/finance` with the correct localized success banner.

## Admin Web — Issues

16. Open `/issues` in English; verify the issues table, status filters, and category filters render.
17. Switch to Arabic; verify RTL layout, table headers, and filter chips.
18. When no issues match the current filter, verify the "No issues found" empty state.
19. Simulate API degradation with zero results; verify the Issues degraded-state amber banner appears.
20. Open a single issue at `/issues/[id]`; verify comments, attachments, status update, and escalation forms work in both English and Arabic.

## Admin Web — Visitors

21. Open `/visitors` in English; verify the gate workspace loads and the pending visitors list is displayed.
22. Switch to Arabic; verify RTL layout and controls.
23. Simulate API degradation; verify the Visitors degraded-state banner appears above the gate workspace.
24. Test allow, deny, and complete actions; verify the gate workspace updates without full page reload.

## Admin Web — Governance

25. Open `/governance` in English; verify the vote list and create-vote form render correctly.
26. Switch to Arabic; verify RTL layout, label translations, and date formatting.
27. When no votes exist, verify the "No votes or polls created yet" empty state appears.
28. Simulate API degradation; verify the Governance degraded-state amber banner appears.
29. Open `/governance/[id]` (vote detail); verify tally results and vote options display in both locales.

## Admin Web — Announcements

30. Open `/announcements` in English; verify the announcement list, filter bar, and composer form render.
31. Switch to Arabic; verify RTL layout and bilingual title/body fields.
32. When no announcements match the active filter, verify the "No announcements" empty state row.
33. Create, publish, and archive announcements; verify success banners appear in both locales.

## Admin Web — Settings

34. Open `/settings` in English; verify all 8 namespace panels render with their fields populated.
35. Switch to Arabic; verify RTL layout and translated labels.
36. Simulate API degradation; verify the Settings degraded-state amber banner appears at the top of the page.
37. Submit a setting change and verify the localized "Settings saved" success banner appears.

## Admin Web — Error Boundaries

38. Force a route-level render failure in the admin app and confirm the route error boundary offers Retry plus Return to dashboard.
39. Force a global app failure and confirm the global error surface renders in the current locale direction with retry and dashboard recovery actions.
40. Verify error boundary copy appears in Arabic when locale is Arabic.

## Build Validation

1. Run `npm run typecheck -w apps/admin`.
2. Run `npm run lint -w apps/admin`.
3. Run `npm run build -w apps/admin`.
4. Confirm zero TypeScript errors.
5. Confirm zero lint errors.

## Mobile Release Readiness

1. Review `apps/mobile/android/app/build.gradle` — confirm signing config references environment variables, not hard-coded credentials.
2. Run `npm run typecheck -w apps/mobile` — confirm zero errors.
3. Test the Finance, Governance, and Security Guard screens on a real device or emulator (English and Arabic).
4. Confirm RTL layout in Arabic mode (verify React Native i18next config forces `I18nManager.allowRTL(true)` when locale is `ar`).

## Human Sign-Off Notes

- English and Arabic parity must be confirmed together; do not sign off from one locale only.
- Degraded-state banners must be treated as operator guidance, not cosmetic messaging.
- All five new degraded banners (Finance, Governance, Issues, Visitors, Settings) must be verified in both English and Arabic.
- The global error boundary (`global-error.tsx`) must be verified in both LTR and RTL directions.
- CM-71 should stay In Progress until all screen checks above pass, `npm run build` succeeds, and mobile TypeScript is clean.
