import { initialiseTenantDatabase, testTenantDatabaseConnection, type PostgresConnectionInput } from './tenant-db-manager';

export type TenantDatabaseSetupResult = {
  ok: boolean;
  message: string;
  steps: Array<{ name: string; ok: boolean; message: string }>;
};

export async function runTenantDatabaseSetup(input: PostgresConnectionInput): Promise<TenantDatabaseSetupResult> {
  const steps: TenantDatabaseSetupResult['steps'] = [];

  const test = await testTenantDatabaseConnection(input);
  steps.push({ name: 'connection-test', ok: test.ok, message: test.message });

  if (!test.ok) {
    return {
      ok: false,
      message: 'Database setup stopped because the connection test failed.',
      steps,
    };
  }

  try {
    const schema = await initialiseTenantDatabase(input);
    steps.push({ name: 'tenant-schema', ok: schema.ok, message: schema.message });
  } catch (error) {
    steps.push({
      name: 'tenant-schema',
      ok: false,
      message: error instanceof Error ? error.message : 'Tenant schema creation failed.',
    });
    return { ok: false, message: 'Database setup stopped because schema creation failed.', steps };
  }

  steps.push({
    name: 'baseline-ready',
    ok: true,
    message: 'Schema is ready for real catalog CRUD reads/writes through unified core.',
  });

  return {
    ok: true,
    message: 'Tenant database setup completed.',
    steps,
  };
}
