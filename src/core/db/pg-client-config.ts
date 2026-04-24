import type { ClientConfig } from 'pg';
import { buildPostgresConnectionString, type PostgresConnectionInput } from './connection-string';

function shouldTrustSelfSignedCertificates() {
  const value = String(process.env.PGSSL_REJECT_UNAUTHORIZED || '').trim().toLowerCase();
  return value !== 'true' && value !== '1' && value !== 'yes';
}

export function buildPgClientConfig(input: PostgresConnectionInput): ClientConfig {
  const connectionString = buildPostgresConnectionString(input);

  if (input.sslMode === 'disable') {
    return { connectionString, ssl: false };
  }

  return {
    connectionString,
    ssl: {
      rejectUnauthorized: !shouldTrustSelfSignedCertificates(),
    },
  };
}
