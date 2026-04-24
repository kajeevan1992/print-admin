import type { ClientConfig } from 'pg';
import {
  allowSelfSignedDbCertificatesForNode,
  buildPostgresConnectionString,
  removePostgresSslQueryParams,
  shouldTrustSelfSignedDbCertificates,
  type PostgresConnectionInput,
} from './connection-string';

export function buildPgClientConfig(input: PostgresConnectionInput): ClientConfig {
  const connectionString = buildPostgresConnectionString(input);

  if (input.sslMode === 'disable') {
    return { connectionString, ssl: false };
  }

  const trustSelfSigned = shouldTrustSelfSignedDbCertificates();
  if (trustSelfSigned) allowSelfSignedDbCertificatesForNode();

  return {
    // Strip sslmode/sslcert query params so node-postgres cannot override the
    // explicit ssl object below. Coolify internal Postgres often uses a cert
    // chain that Node does not trust by default.
    connectionString: removePostgresSslQueryParams(connectionString),
    ssl: {
      rejectUnauthorized: !trustSelfSigned,
    },
  };
}
