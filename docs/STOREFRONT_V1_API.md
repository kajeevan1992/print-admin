# Tenant-safe Storefront API v1

This API is the server-to-server contract for a shared multi-tenant storefront deployment. The browser never establishes tenant authority. API credentials are verified on the server, scopes are enforced, `x-store-id` is checked against the credential, and the tenant is derived from the authorised store.

## Credential configuration

Credentials may be stored as `CoreCatalogRecord` rows using resource `storefront-api-credentials`, or supplied through `STOREFRONT_API_CREDENTIALS_JSON` / `PUBLIC_API_CREDENTIALS_JSON`.

A runtime shared-frontend credential should use:

```json
{
  "apiKey": "storefront_runtime_key",
  "secretHash": "sha256:<hex digest>",
  "tenantId": "platform-service",
  "accessMode": "published-stores",
  "serviceClient": true,
  "status": "active",
  "scopes": [
    "storefront:resolve",
    "storefront:read",
    "catalog:read",
    "pricing:calculate",
    "checkout:create"
  ]
}
```

A tenant management credential should be tenant-bound and use only the management scopes it needs:

- `storefront:manage`
- `storefront:publish`
- `storefront:domains`

Raw secrets remain supported for compatibility. New database credentials should store `secretHash` rather than a plaintext secret.

## Store records

The implementation persists storefront configuration in existing `CoreCatalogRecord` storage:

- `storefront-stores`: tenant/store association, theme, branding, navigation, content, status and preview URL
- `storefront-domains`: globally reserved platform/custom domain bindings
- `storefront-store-slugs`: globally reserved store slugs
- `storefront-idempotency`: completed create/checkout responses

No separate frontend deployment or tenant API secret is required. Publishing a store makes its active domain discoverable through `/api/v1/storefront/resolve`.

## Required environment variables

- `STOREFRONT_ROOT_DOMAIN`: root used for automatic subdomains, for example `shops.example.com`
- `STOREFRONT_FRONTEND_URL`: shared frontend URL used for preview links
- `STRIPE_SECRET_KEY`: required to create hosted checkout sessions

## Integration tests

Run against a deployed test environment:

```bash
pnpm test:storefront-v1
```

The test file documents the optional `STOREFRONT_TEST_*` variables for tenant isolation, pricing, mixed VAT, custom-size, checkout idempotency and automatic store provisioning coverage. Tests skip only when their required fixture variables are not supplied.
