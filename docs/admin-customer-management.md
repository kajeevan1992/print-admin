# Admin customer management

The tenant **Customers** workspace at `/customers` is the staff support view for real storefront customer accounts.

## Data authority

The workspace does not maintain a second CRM copy of customer commerce or security data. It reads the tenant-scoped authoritative records already used by the storefront:

- `StorefrontCustomer` and saved addresses
- storefront customer sessions
- authenticator two-step status
- trusted browsers
- passkeys
- orders
- formal quotations
- formal invoices and credit notes

The workspace adds only internal support notes through `CustomerSupportNote`. Staff actions are also written to the existing tenant `AuditLog` when it is available.

## Access boundary

Both customer-management API routes require a valid tenant admin or staff session:

- `GET /api/internal/customer-management`
- `GET|POST /api/internal/customer-management/:customerId`

Tenant identity comes from the authenticated admin session. A browser-provided tenant or customer email cannot switch the query into another tenant.

Uploaded storefront themes receive no customer-management data or authority.

## Supported staff actions

Staff can:

- search and filter customer accounts
- review safe commercial totals and document history
- review verified-email, authenticator, passkey, trusted-browser and session status
- edit the customer's name, phone number and company
- add internal support notes
- resend email verification
- send the normal one-hour password-reset email
- revoke all active customer sessions
- revoke all trusted browsers
- revoke all passkeys
- suspend or reactivate an account

Every security mutation is scoped by tenant ID and customer ID. Destructive actions require a confirmation in the interface.

## Prohibited support shortcuts

The workspace deliberately does not allow staff to:

- read a customer password
- set a customer password directly
- see authenticator secrets, recovery codes or passkey public-key material
- approve a login-email change
- create a customer session
- impersonate a customer

Login-email changes remain controlled by the existing dual-confirmation workflow. Password recovery always sends a link to the saved login email.

## Suspension and revocation

Suspending an account:

1. marks the account inactive
2. increments its session version
3. revokes active storefront sessions
4. revokes trusted-browser access
5. records an audit event
6. queues a tenant-branded customer security email

Suspension does not delete orders, quotations, invoices, addresses, notes, authenticator configuration or passkeys. Reactivation restores normal credential-based sign-in but does not create a session for staff.

Signing out all sessions rotates the session version and revokes both current sessions and trusted browsers. Revoking passkeys does not disable password recovery.

## Email delivery

Verification, password recovery and support security alerts use the tenant's existing SMTP settings and internal email outbox. If immediate SMTP delivery fails, the message remains queued for the existing outbox workflow.

Security links use the selected customer storefront. The interface defaults to a storefront already present in the customer's account activity, falling back to the tenant's default storefront.

## Privacy

Session and trusted-browser views expose only safe browser/device descriptions and masked network hints. Raw session tokens, token hashes, complete IP addresses, full user-agent strings, password hashes, passkey keys and authenticator secrets never reach the customer-management browser.
