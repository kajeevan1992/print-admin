# Customer two-step verification

The storefront customer account supports authenticator-app two-step verification and trusted-browser management at:

`/native-stores/{tenantSlug}/{storeSlug}/account/profile`

## Customer capabilities

- Enable TOTP authenticator protection after confirming the current password and verified login email.
- Add the account manually using a Base32 secret or the standard `otpauth://` setup URI.
- Confirm setup with a six-digit authenticator code.
- Receive ten single-use recovery codes and copy them before leaving the page.
- Complete password sign-in with an authenticator or recovery code.
- Trust a private browser for 30 days after a successful password and two-step sign-in.
- Review trusted browsers with safe browser, device, masked network, last-used and expiry details.
- Remove one trusted browser or password-confirm removal of all trusted browsers.
- Regenerate recovery codes after confirming the current password and an existing authenticator or recovery code.
- Disable two-step verification after confirming the current password and an existing authenticator or recovery code.

## Security behaviour

- Authenticator secrets are encrypted with AES-256-GCM before database storage.
- `CUSTOMER_MFA_ENCRYPTION_KEY` is the preferred stable encryption material. Existing database connection secret material is used only as a deployment-compatible fallback.
- Recovery codes are stored only as SHA-256 hashes and consumed once.
- Password validation happens before either a trusted-browser check or a short-lived two-step challenge.
- A trusted browser never replaces the password. It only skips the authenticator step after the password succeeds.
- Trusted-browser tokens are random, stored only as SHA-256 hashes, scoped to customer, tenant and storefront, and bound to the customer's current session version.
- A trusted-browser token rotates every time it is accepted, expires after 30 days and is limited to ten active browsers per customer/storefront.
- Password changes, password resets and verified email changes invalidate trusted browsers through session-version rotation. Their current browser cookie is also cleared by the storefront response.
- Disabling two-step verification explicitly revokes all trusted browsers for that storefront.
- Normal sign-out ends the customer session but deliberately keeps browser trust until expiry or manual revocation.
- Challenges expire after ten minutes, permit at most eight failed attempts and are stored only as hashed tokens.
- Challenge and trusted-browser tokens are held in HttpOnly, Secure, SameSite=Lax cookies.
- A challenge is bound to tenant, storefront, customer and the customer's current session version.
- Password changes, password resets and verified email changes invalidate older challenges through session-version mismatch.
- No authenticated customer session is created until the second factor succeeds or a valid trusted browser is accepted after the correct password.
- Enabling or disabling protection signs out other storefront customer sessions while preserving the current session.
- Password reset does not bypass two-step verification. Protected customers must sign in again and complete a fresh challenge because the reset invalidates every older trusted browser.
- New trusted-browser and remove-all events generate security alerts through tenant SMTP and the existing internal email outbox.

## Theme authority boundary

Uploaded themes receive protected SaaS-rendered slots for the two-step login challenge and account security controls. Password verification, TOTP generation and checking, secret encryption, recovery-code hashing, trusted-browser token generation/rotation/revocation, challenge state, session issuance, revocation and email delivery stay inside the SaaS runtime.
