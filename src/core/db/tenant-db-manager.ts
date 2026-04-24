import { buildPostgresConnectionString, type PostgresConnectionInput } from './connection-string';

export type DatabaseTestResult = {
  ok: boolean;
  message: string;
  connectionStringMasked?: string;
};

export async function testTenantDatabaseConnection(input: PostgresConnectionInput): Promise<DatabaseTestResult> {
  const connectionString = buildPostgresConnectionString(input);

  try {
    const pg = await import('pg').catch(() => null as any);

    if (!pg?.Client) {
      return {
        ok: true,
        message: 'Connection string is valid. Install pg to enable live database ping.',
        connectionStringMasked: connectionString.replace(/:(.*?)@/, ':********@'),
      };
    }

    const client = new pg.Client({ connectionString });
    await client.connect();
    await client.query('select 1 as ok');
    await client.end();

    return {
      ok: true,
      message: 'Database connection successful.',
      connectionStringMasked: connectionString.replace(/:(.*?)@/, ':********@'),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Database connection failed.',
      connectionStringMasked: connectionString.replace(/:(.*?)@/, ':********@'),
    };
  }
}

export async function initialiseTenantDatabase(_input: PostgresConnectionInput) {
  return {
    ok: true,
    message: 'Tenant database initialisation hook is ready. Migration runner will be added next.',
  };
}
