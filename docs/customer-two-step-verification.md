# Customer two-step verification

The storefront customer account supports authenticator-app two-step verification at:

`/native-stores/{tenantSlug}/{storeSlug}/account/profile`

## Customer capabilities

- Enable TOTP authenticator protection after confirming the current password and verified login email.
- Add the account manually using a Base32 secret or the standard `otpauth://` setup URI.
- Confirm setup with a six-digit authenticator code.
- Receive ten single-use recovery codes and copy them before leaving the page.
- Complete password sign-in with an authenticator or recovery code.
- Regenerate recovery codes after confirming the current password and an existing authenticator or recovery code.
- Disable two-step verification after confirming the current password and an existing authenticator or recovery code.

## Security behaviour

- Authenticator secrets are encrypted with AES-256-GCM before database storage.
- `CUSTOMER_MFA_ENCRYPTION_KEY` is the preferred stable encryption material. Existing database connection secret material is used only as a deployment-compatible fallback.
- Recovery codes are stored only as SHA-256 hashes and consumed once.
- Password validation happens before a short-lived two-step challenge is created.
- Challenges expire after ten minutes, permit at most eight failed attempts and are stored only as hashed tokens.
- Challenge tokens are held in HttpOnly, Secure, SameSite=Lax cookies.
- A challenge is bound to tenant, storefront, customer and the customer's current session version.
- Password changes, password resets and verified email changes invalidate older challenges through session-version mismatch.
- No authenticated customer session is created until the second factor succeeds.
- Enabling or disabling protection signs out other storefront customer sessions while preserving the current session.
- Password reset does not bypass two-step verification. Protected customers must sign in again and complete the challenge.
- Security alerts are delivered through tenant SMTP and the existing internal email outbox.

## Theme authority boundary

Uploaded themes receive protected SaaS-rendered slots for the two-step login challenge and account security controls. Password verification, TOTP generation and checking, secret encryption, recovery-code hashing, challenge state, session issuance, revocation and email delivery stay inside the SaaS runtime.
