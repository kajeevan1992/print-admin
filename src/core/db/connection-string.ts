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
