# Storefront customer account security

The storefront customer identity is separate from staff and admin authentication. This phase adds email verification and password recovery without giving a theme package access to tokens, customer records, SMTP credentials or account mutations.

## Email verification

- A new customer account receives a single-use verification token.
- Only the SHA-256 token hash is stored.
- The token is scoped to tenant, storefront and `verify-email` purpose.
- Verification links expire after 48 hours.
- Requesting a new link consumes earlier unused verification links.
- Signed-in customers can resend verification from their account dashboard.
- The account remains usable while unverified, but the dashboard clearly shows the verification state.

Public route:

```text
/native-stores/{tenantSlug}/{storeSlug}/verify-email?token={single-use-token}
```

## Password recovery

- Forgot-password responses never reveal whether an account exists.
- Reset tokens are single-use, hashed, tenant/store scoped and expire after one hour.
- A successful reset increments the customer session version and revokes every existing customer session.
- The used reset token and all other unused reset tokens for that account are consumed.
- A fresh customer session is issued only after the password is changed successfully.

Public routes:

```text
/native-stores/{tenantSlug}/{storeSlug}/forgot-password
/native-stores/{tenantSlug}/{storeSlug}/reset-password?token={single-use-token}
```

## Email delivery

Verification and recovery messages use the tenant's existing Email Settings and internal email outbox. The service queues the message first and then attempts immediate SMTP delivery. When SMTP is unavailable, the outbox retains the delivery status for staff review instead of exposing configuration details to the customer.

## Security boundaries

- Theme packages receive only the existing protected customer-account React slot.
- Raw tokens are sent only to the intended customer email and are never returned to a theme.
- Token lookups require the matching tenant, store and purpose.
- Public security actions use a dedicated rate-limit scope.
- Passwords continue to use the existing PBKDF2-SHA256 format with 210,000 iterations and a random salt.
- Customer sessions remain separate from administrator sessions.
