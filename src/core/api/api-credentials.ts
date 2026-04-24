import crypto from 'crypto';
import { encryptSecret } from '../security/encryption';

export type ApiCredentialScope =
  | 'catalog:read'
  | 'catalog:write'
  | 'orders:read'
  | 'orders:write'
  | 'artwork:read'
  | 'artwork:write'
  | 'pricing:read'
  | 'pricing:write'
  | 'webhooks:write';

export type ApiCredential = {
  id: string;
  ownerId: string;
  tenantId?: string;
  siteId?: string;
  label: string;
  keyPrefix: string;
  secretHash: string;
  encryptedSecretPreview?: string;
  scopes: ApiCredentialScope[];
  status: 'active' | 'revoked';
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
};

export function generateApiKeyPair(prefix = 'pk_live') {
  const key = `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
  const secret = `sk_${crypto.randomBytes(32).toString('hex')}`;
  return { key, secret };
}

export function hashApiSecret(secret: string) {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

export function createApiCredentialRecord(input: {
  ownerId: string;
  tenantId?: string;
  siteId?: string;
  label: string;
  scopes: ApiCredentialScope[];
}) {
  const { key, secret } = generateApiKeyPair();
  const now = new Date().toISOString();
  const record: ApiCredential = {
    id: `api_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    ownerId: input.ownerId,
    tenantId: input.tenantId,
    siteId: input.siteId,
    label: input.label,
    keyPrefix: key.slice(0, 16),
    secretHash: hashApiSecret(secret),
    encryptedSecretPreview: encryptSecret(secret.slice(0, 12)),
    scopes: input.scopes,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  return {
    record,
    credentials: { key, secret },
  };
}

export function verifyApiSecret(secret: string, hash: string) {
  return hashApiSecret(secret) === hash;
}
