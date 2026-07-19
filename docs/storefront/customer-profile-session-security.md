# Customer profile and session security

The storefront customer account includes a protected **Profile & security** section at:

`/native-stores/{tenantSlug}/{storeSlug}/account/profile`

## Customer capabilities

- Update full name, phone and company details.
- View the fixed login email and verification state.
- Change the password after confirming the current password.
- Review active sessions for the current storefront.
- See a safe device/browser description, masked network hint, sign-in time, last activity and expiry.
- Sign out an individual non-current session.
- Sign out every other active session for the storefront.

## Security behaviour

- Profile and session mutations require a valid customer session.
- Every operation is scoped to the authenticated customer, tenant and storefront.
- Raw session tokens, token hashes, full IP addresses and full user-agent strings are never returned to the browser.
- Password changes require the current password and a different replacement of at least 10 characters.
- Password changes increment the customer session version, revoke all existing sessions and issue one fresh session cookie.
- Outstanding password-reset tokens are consumed during an in-account password change.
- A password-change alert is queued and immediately attempted through the tenant email settings and existing email outbox.
- The current session cannot be revoked through the device list; the normal Sign out action must be used.

## Theme authority boundary

Themes continue to receive the existing protected customer-account React slot. Profile writes, password verification, hashing, session lookup, session revocation, token cleanup and email delivery remain inside the SaaS runtime.

Login-email changes are intentionally not included. They require a separate verified-email-change workflow so the old and new addresses can both be handled safely.
