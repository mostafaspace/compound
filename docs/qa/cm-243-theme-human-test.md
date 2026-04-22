# CM-243 Theme Human Test Plan

Jira: CM-243, CM-245, CM-246, CM-247

Date: 2026-04-22

## Scope

Validate dark, light, and system theme behavior across the admin web app and mobile shell. Theme selection is client-only; backend validation confirms existing APIs and notification broadcasting remain unaffected.

## Admin Web Checks

1. Open `http://localhost:3001/login`.
2. Switch the language to English and confirm the theme control labels render in English.
3. Select Light, System, and Dark modes.
4. Confirm the active theme button highlights correctly after each selection.
5. Reload the page and confirm the selected theme persists through `next-themes` local storage.
6. In Dark mode, confirm page background, cards, borders, buttons, inputs, and notification center surfaces use readable contrast.
7. Switch the language to Arabic.
8. Confirm the page direction is RTL, Arabic labels render, and the theme control remains aligned without text overflow.
9. Repeat Light, System, and Dark selections in Arabic.

Expected result: theme selection is visible, persistent, bilingual, RTL-safe, and does not hide or overlap login, header, navigation, notification, or action controls.

## Mobile App Checks

1. Open the React Native app with the resident shell.
2. Confirm the header theme segmented control shows Light, System, and Dark in English.
3. Select Light and confirm the shell background and card text remain readable.
4. Select Dark and confirm the shell background changes to the dark palette and the status bar uses light content.
5. Select System and confirm it follows the device system theme.
6. Switch the device/app language to Arabic.
7. Confirm the shell direction is RTL and the theme segmented control labels render in Arabic.
8. Scroll Dashboard, Unit Profile, Notifications, Visitors, Issues, and Announcements in both Light and Dark modes.
9. Confirm no visible English-only labels are introduced by the theme controls or touched visitor cancellation flow.
10. Create a visitor pass, cancel it, and confirm the API receives a localized cancellation reason instead of a hardcoded English-only value.

Expected result: mobile theme override changes the visual palette consistently, Arabic/English labels are available, RTL layout remains coherent, and the visitor cancellation reason is localized.

## Backend Regression Checks

1. Run the backend test suite.
2. Confirm `GET /api/v1/status` still returns HTTP 200.
3. Confirm failed queue jobs are unchanged from the known pre-existing broadcast failures, or clear if no failures are expected in the environment.

Expected result: no API, database, authorization, queue, or audit behavior changes are introduced by CM-243.

Validation note: while running this QA pass, queued notification broadcasts were hardened to serialize scalar payload data instead of an Eloquent `Notification` model. This prevents Horizon failures when broadcasts are processed after test database cleanup or after a notification row is unavailable.

## Ready For Human Test Criteria

- CM-245 Backend is already Ready For Human Test because theme is client-only and backend regression passes.
- CM-246 Frontend remains Ready For Human Test after admin and mobile theme controls compile.
- CM-247 QA can move to Ready For Human Test after this document exists, mobile visitor cancellation copy is localized, and validation commands pass.
- CM-243 parent can move to Ready For Human Test only after CM-245, CM-246, and CM-247 are all Ready For Human Test or Done.

## Human QA Focus

- Admin persistence across browser reloads.
- System theme following the operating system setting.
- Arabic RTL layout on admin and mobile.
- Text overflow in longer Arabic theme labels.
- Mobile status bar readability in Dark mode.
- Visitor cancellation audit/reason display in Arabic and English.
