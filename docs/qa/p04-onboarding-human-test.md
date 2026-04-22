# P04 Onboarding Human Test Checklist

Use this checklist before moving `CM-4`, `CM-29`, or `CM-30` to Ready For Human Test. Test both English and Arabic by toggling the admin language cookie, and verify Arabic screens render right-to-left without clipped labels or overlapping controls.

## Admin Invite Flow

1. Sign in as a compound admin.
2. Open a unit detail page and create a resident owner invite with email, phone, relation, start date, and primary-contact flag.
3. Confirm the invite appears in `/onboarding` with the correct role, unit, status, delivery count, and expiry in English.
4. Switch to Arabic and confirm the same onboarding table, filters, empty states, actions, status labels, relation labels, and dates are Arabic/RTL.
5. Resend the invite and confirm delivery count increments and the previous token no longer opens.
6. Revoke a pending invite and confirm the public invite link can no longer be accepted.

## Public Invite Acceptance

1. Open the latest invite acceptance link in English.
2. Confirm title, subtitle, unit summary, expiry, field labels, submit button, and privacy note are English.
3. Switch to Arabic and reload the same link.
4. Confirm all public invite copy is Arabic/RTL and the email/unit/expiry values still display correctly.
5. Complete name, phone, password, and confirmation.
6. Confirm the user is redirected to login with the accepted-invite success message localized.

## Verification Review

1. In admin `/onboarding`, confirm the accepted resident appears in the verification review queue with status `pending_review`.
2. Request more information with a clear note.
3. Sign in as the resident on mobile and confirm the pending verification panel shows the requested note in English and Arabic.
4. Upload a follow-up verification document from mobile when more information is requested.
5. Back in admin, approve the request and confirm the account becomes active and the linked unit membership becomes verified.
6. Repeat with a second invite and reject the request with a reason; confirm the account is suspended and the membership is rejected.

## Notifications And Email

1. Inspect the resident invitation email in Mailpit or the configured mail sink.
2. Confirm the subject, greeting, unit line, expiry line, action label, and safety note include both English and Arabic.
3. Trigger approval, rejection, and request-more-info decisions.
4. Confirm each verification decision email includes English and Arabic subject/greeting/body/unit line/reviewer note/final support line.
5. Confirm the notification center and mobile notification card use Arabic title/body when Arabic is active and English title/body when English is active.

## Security And Regression

1. Confirm a pending resident can authenticate but cannot access admin/property routes.
2. Confirm a pending resident can only list their own verification requests.
3. Confirm expired, revoked, and old rotated invitation tokens return the expected blocked response.
4. Confirm required rejection and request-more-info notes cannot be skipped.
5. Confirm no failed queue jobs are recorded after mail and notification delivery.
