# Storefront customer privacy and account closure

## Customer controls

The protected Account → Profile & Security workspace provides two privacy actions:

- **Download my data** creates a private JSON export containing the customer profile, saved addresses, orders, formal quotes and formal invoices scoped to the current tenant and storefront.
- **Close customer account** permanently disables the customer login after current-password verification, verified-email enforcement, the exact phrase `CLOSE MY ACCOUNT` and a browser confirmation.

Both actions are rate limited and require a valid storefront customer session. Responses are marked private/no-store.

## Closure behaviour

Closing an account:

- revokes every customer session;
- removes saved addresses;
- invalidates password access by replacing the password material;
- anonymises the login email, name, phone and company fields;
- disables the customer row and increments its session version;
- retires email verification and password-reset tokens;
- cancels pending login-email changes;
- removes authenticator configuration and challenges;
- revokes trusted browsers;
- revokes passkeys and pending passkey challenges;
- clears the session, two-step challenge and trusted-browser cookies;
- queues a closure confirmation through the tenant email/outbox system.

The operation is intentionally irreversible from the storefront.

## Records retained

Formal orders, invoice snapshots, credit notes, payment records and tax/accounting records are not deleted. These records can have independent legal, fraud-prevention, accounting and customer-service retention requirements. Their immutable customer/order snapshots remain available to authorised store staff even after the customer login profile is anonymised.

The data export includes a retention notice explaining this distinction.

## Theme authority boundary

Uploaded or installed themes receive only the protected privacy interface through the existing account slot. Password verification, export assembly, account anonymisation, credential revocation, retention rules, cookie clearing and email delivery remain inside SaaS-owned services and API routes.
