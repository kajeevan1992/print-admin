import { NextResponse } from 'next/server';
import { verifyApiSecret, type ApiCredentialScope } from './api-credentials';
import { authenticateOwnerApiKey } from './owner-api-key-registry';

export type PublicApiContext = { apiKey: string; tenantId: string; siteId?: string; scopes: ApiCredentialScope[] };
export type PublicApiAuthResult = { ok: true; context: PublicApiContext } | { ok: false; response: NextResponse };

function splitScopes(value?: string): ApiCredentialScope[] {
  return (value || '').split(',').map((item) => item.trim()).filter(Boolean) as ApiCredentialScope[];
}

function configuredCredential() {
  return {
    apiKey: process.env.PUBLIC_API_KEY || process.env.EXTERNAL_API_KEY || '',
    secretHash: process.env.PUBLIC_API_SECRET_HASH || process.env.EXTERNAL_API_SECRET_HASH || '',
    plainSecret: process.env.PUBLIC_API_SECRET || process.env.EXTERNAL_API_SECRET || '',
    tenantId: process.env.PUBLIC_API_TENANT_ID || process.env.EXTERNAL_API_TENANT_ID || '',
    siteId: process.env.PUBLIC_API_SITE_ID || process.env.EXTERNAL_API_SITE_ID || undefined,
    scopes: splitScopes(process.env.PUBLIC_API_SCOPES || process.env.EXTERNAL_API_SCOPES || 'catalog:read,orders:read,orders:write,webhooks:write'),
  };
}

function failure(error: string, message: string, status: number) {
  return NextResponse.json({ ok: false, error, message }, { status });
}

export function requirePublicApiCredentials(request: Request, requiredScopes: ApiCredentialScope[] = []): PublicApiAuthResult {
  const apiKey = request.headers.get('x-api-key') || '';
  const apiSecret = request.headers.get('x-api-secret') || '';

  if (!apiKey || !apiSecret) {
    return { ok: false, response: failure('API_CREDENTIALS_REQUIRED', 'Public API requests require x-api-key and x-api-secret headers.', 401) };
  }

  const ownerCredential = authenticateOwnerApiKey(apiKey, apiSecret);
  if (ownerCredential.ok) {
    const missingScopes = requiredScopes.filter((scope) => !ownerCredential.credential.scopes.includes(scope));
    if (missingScopes.length) {
      return { ok: false, response: failure('API_CREDENTIALS_FORBIDDEN', `API key is missing required scope(s): ${missingScopes.join(', ')}.`, 403) };
    }

    return {
      ok: true,
      context: {
        apiKey,
        tenantId: ownerCredential.credential.tenantId,
        siteId: ownerCredential.credential.siteId,
        scopes: ownerCredential.credential.scopes,
      },
    };
  }

  const configured = configuredCredential();
  if (!configured.apiKey || (!configured.secretHash && !configured.plainSecret) || !configured.tenantId) {
    return { ok: false, response: failure('PUBLIC_API_NOT_CONFIGURED', 'Owner API Keys or PUBLIC_API credentials must be configured before external requests are accepted.', 503) };
  }

  const secretMatches = configured.secretHash ? verifyApiSecret(apiSecret, configured.secretHash) : apiSecret === configured.plainSecret;
  if (apiKey !== configured.apiKey || !secretMatches) {
    return { ok: false, response: failure('API_CREDENTIALS_INVALID', 'Invalid public API credentials.', 401) };
  }

  const missingScopes = requiredScopes.filter((scope) => !configured.scopes.includes(scope));
  if (missingScopes.length) {
    return { ok: false, response: failure('API_CREDENTIALS_FORBIDDEN', `API key is missing required scope(s): ${missingScopes.join(', ')}.`, 403) };
  }

  return { ok: true, context: { apiKey, tenantId: configured.tenantId, siteId: configured.siteId, scopes: configured.scopes } };
}
