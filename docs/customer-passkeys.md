# Customer passkeys

Storefront customers can add and manage passkeys at:

`/native-stores/{tenantSlug}/{storeSlug}/account/profile`

The customer sign-in page also exposes a protected **Sign in with a passkey** action when the browser supports WebAuthn.

## Customer capabilities

- Register up to ten passkeys per customer and storefront.
- Use platform authenticators such as Face ID, Touch ID and Windows Hello.
- Use compatible password managers or roaming FIDO2 security keys.
- Sign in without entering the customer password or authenticator code after the passkey performs required device verification.
- View the passkey name, whether it is synced/backed up, when it was added and when it was last used.
- Remove a passkey immediately from Profile & Security.
- Continue using password, authenticator, recovery-code and password-reset fallbacks.

## Enrolment and removal authority

- The customer must already be signed in.
- The login email must be verified before a passkey can be added.
- The current password is required before adding or removing a passkey.
- When authenticator two-step verification is enabled, its current six-digit code is also required.
- Recovery codes are intentionally not accepted for passkey management; they remain emergency sign-in credentials.
- Adding or removing a passkey sends a security alert through the tenant SMTP settings and existing email outbox.

## Authentication behaviour

- Passkeys are discoverable WebAuthn credentials scoped to the current storefront host.
- User verification is required during both registration and sign-in.
- Passkey sign-in is a primary authentication method and does not create a password or TOTP challenge.
- Successful passkey authentication issues the same tenant/store-scoped 30-day customer session used by other sign-in methods.
- Any anonymous basket is attached to the authenticated customer after successful passkey sign-in.
- Password and authenticator sign-in remain available if a passkey is lost or unavailable.

## Security behaviour

- Registration and authentication challenges are random, single-use and expire after five minutes.
- Challenge cookies are HttpOnly, Secure in production and SameSite=Lax.
- Challenges are bound to tenant, storefront, purpose, RP ID and exact origin.
- Only the public credential key, credential ID, counter, transports and safe device metadata are stored by the SaaS.
- Private passkey keys remain inside the customer's authenticator or credential provider.
- Authentication counters are updated after verified use.
- Removed credentials are retained only as revoked audit records and are rejected for sign-in.
- Public passkey actions and account passkey management use separate rate-limit scopes.

## Host and custom-domain behaviour

The RP ID is derived from the hostname that serves the storefront. A passkey created on one hostname is not valid on an unrelated hostname. Before moving an established storefront to a different registrable domain, plan a customer migration period in which users can sign in through the existing hostname and register a new passkey on the new hostname.

## Theme authority boundary

Uploaded themes receive only the protected SaaS-rendered login and account-security slots. Challenge generation, origin/RP validation, public-key verification, credential counters, customer lookup, session issuance, passkey revocation and security email delivery remain inside the SaaS runtime.
