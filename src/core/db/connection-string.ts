export type PostgresConnectionInput = {
  host: string;
  port: number | string;
  database: string;
  username: string;
  password: string;
  sslMode?: 'disable' | 'prefer' | 'require';
};

export function buildPostgresConnectionString(input: PostgresConnectionInput) {
  const user = encodeURIComponent(input.username);
  const password = encodeURIComponent(input.password);
  const host = input.host.trim();
  const port = String(input.port || 5432);
  const database = encodeURIComponent(input.database);
  const sslMode = input.sslMode || 'prefer';
  return `postgres://${user}:${password}@${host}:${port}/${database}?sslmode=${sslMode}`;
}

export function maskConnectionString(value: string) {
  return value.replace(/:(.*?)@/, ':********@');
}

export function shouldTrustSelfSignedDbCertificates() {
  const value = String(process.env.PGSSL_REJECT_UNAUTHORIZED || '').trim().toLowerCase();
  return value !== 'true' && value !== '1' && value !== 'yes';
}

export function allowSelfSignedDbCertificatesForNode() {
  if (shouldTrustSelfSignedDbCertificates() && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }
}

export function removePostgresSslQueryParams(value: string) {
  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) return value;
    url.searchParams.delete('sslmode');
    url.searchParams.delete('sslaccept');
    url.searchParams.delete('sslrootcert');
    url.searchParams.delete('sslcert');
    url.searchParams.delete('sslkey');
    return url.toString();
  } catch {
    return value;
  }
}

export function normalizePrismaPostgresUrl(value?: string | null) {
  if (!value) return value || '';

  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) return value;

    const sslMode = url.searchParams.get('sslmode');
    const wantsSsl = sslMode === 'require' || sslMode === 'prefer' || sslMode === 'no-verify';

    if (wantsSsl && shouldTrustSelfSignedDbCertificates()) {
      allowSelfSignedDbCertificatesForNode();
      url.searchParams.set('sslmode', 'require');
      url.searchParams.set('sslaccept', 'accept_invalid_certs');
    }

    return url.toString();
  } catch {
    return value;
  }
}
