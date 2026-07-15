# Storefront test provisioning

Use the super-admin-only endpoint below to provision one real storefront test target without hardcoding tenant, store, product or credential values into the application:

```text
POST /api/internal/platform/storefront-provisioning
```

The caller must have an active Print Admin super-admin session. Send a JSON payload matching `holo-print-test-target.json`.

The operation is idempotent for the tenant, store and product identifiers. It creates or updates:

- the tenant record
- one store and its staging domain
- the selected theme, branding, content and navigation
- one published product with option groups and an authoritative pricing matrix
- one restricted server-side Storefront API credential

The API secret is returned only when the credential is first created or explicitly rotated. Only its SHA-256 hash is stored. Re-running the same payload does not reveal the existing secret. Set `rotateCredential` to `true` to issue a replacement.

The generated credential is restricted to the single store and these runtime scopes:

- `storefront:resolve`
- `storefront:read`
- `catalog:read`
- `pricing:calculate`
- `checkout:create`

Replace the sample staging domain with the actual temporary frontend deployment hostname before provisioning.
