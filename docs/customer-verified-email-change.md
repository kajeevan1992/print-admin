# Verified customer login email changes

Storefront customers can change their login email from the protected **Profile & security** workspace:

`/native-stores/{tenantSlug}/{storeSlug}/account/profile`

## Customer flow

1. The signed-in customer enters a replacement email and confirms the current password.
2. The SaaS creates one tenant/store/customer-scoped request that expires after 24 hours.
3. The current email receives an approval link.
4. The replacement email receives a verification link.
5. Neither link can change the account by itself.
6. After both single-use links succeed, the SaaS changes the login email, marks the replacement address verified and revokes every customer session.
7. Completion alerts are sent to both the previous and replacement addresses.
8. The customer signs in again using the replacement address.

## Security behaviour

- Initiation requires an authenticated storefront customer session and the current password.
- Replacement addresses are normalised and checked against the tenant-level customer-email uniqueness rule.
- Requests are scoped to customer, tenant and storefront.
- Only SHA-256 token hashes are stored. Raw tokens exist only long enough to build the queued emails.
- Each address has a different cryptographically random token.
- A token hash is retired immediately after its successful confirmation, making each link single-use.
- Starting a replacement request cancels every earlier pending request for that customer and storefront.
- Completing a request increments the customer session version, revokes all sessions and consumes outstanding verification/reset tokens.
- Changing or resetting the password cancels every pending login-email request.
- Cancelling a request requires a current authenticated customer session.
- Public confirmation responses never return either full email address.
- Tenant SMTP settings and the existing email outbox remain responsible for delivery and retry visibility.

## Theme authority boundary

Themes continue to receive only the protected customer-account React slot. They may style the surrounding account page, but they do not receive raw tokens, password hashes, full session records, SMTP credentials or direct database authority.

The following remain SaaS-owned:

- password verification
- address uniqueness checks
- token generation and hashing
- old/new confirmation state
- transaction locking and completion
- customer-email mutation
- session revocation
- security-token invalidation
- tenant email queuing and delivery
