import { buildPostgresConnectionString, maskConnectionString, type PostgresConnectionInput } from './connection-string';
import { ensureTenantSchema } from './tenant-schema';

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
        ok: false,
        message: 'pg is required for live tenant database checks.',
        connectionStringMasked: maskConnectionString(connectionString),
      };
    }

    const client = new pg.Client({ connectionString });
    await client.connect();
    await client.query('select 1 as ok');
    await client.end();

    return {
      ok: true,
      message: 'Database connection successful.',
      connectionStringMasked: maskConnectionString(connectionString),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Database connection failed.',
      connectionStringMasked: maskConnectionString(connectionString),
    };
  }
}

export async function initialiseTenantDatabase(input: PostgresConnectionInput) {
  return ensureTenantSchema(input);
}
