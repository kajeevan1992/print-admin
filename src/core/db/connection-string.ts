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

export function normalizePrismaPostgresUrl(value?: string | null) {
  if (!value) return value || '';

  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) return value;

    const sslMode = url.searchParams.get('sslmode');
    const wantsSsl = sslMode === 'require' || sslMode === 'prefer';
    const rejectSetting = String(process.env.PGSSL_REJECT_UNAUTHORIZED || '').trim().toLowerCase();
    const shouldAcceptInvalidCerts = rejectSetting !== 'true' && rejectSetting !== '1' && rejectSetting !== 'yes';

    if (wantsSsl && shouldAcceptInvalidCerts && !url.searchParams.has('sslaccept')) {
      url.searchParams.set('sslaccept', 'accept_invalid_certs');
    }

    return url.toString();
  } catch {
    return value;
  }
}
