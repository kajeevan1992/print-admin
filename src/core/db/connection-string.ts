export type PostgresConnectionInput = {
  host: string;
  port: number | string;
  database: string;
  username: string;
  password: string;
  sslMode?: 'disable' | 'prefer' | 'require';
};

export type PrismaPostgresPoolOptions = {
  connectionLimit?: number;
  poolTimeoutSeconds?: number;
  connectTimeoutSeconds?: number;
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

function positiveInteger(value: number | undefined) {
  if (!Number.isFinite(value) || Number(value) <= 0) return null;
  return Math.floor(Number(value));
}

function setPoolDefault(url: URL, key: string, value: number | undefined) {
  const next = positiveInteger(value);
  if (next && !url.searchParams.has(key)) url.searchParams.set(key, String(next));
}

export function normalizePrismaPostgresUrl(value?: string | null, pool: PrismaPostgresPoolOptions = {}) {
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

    setPoolDefault(url, 'connection_limit', pool.connectionLimit);
    setPoolDefault(url, 'pool_timeout', pool.poolTimeoutSeconds);
    setPoolDefault(url, 'connect_timeout', pool.connectTimeoutSeconds);

    return url.toString();
  } catch {
    return value;
  }
}
