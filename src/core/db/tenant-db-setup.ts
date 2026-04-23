import { testTenantDatabaseConnection, type PostgresConnectionInput } from './tenant-db-manager';

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

  // Foundation hook. Future pass will run schema migrations here.
  steps.push({
    name: 'migration-runner',
    ok: true,
    message: 'Migration runner hook ready. Tenant schema creation will be enabled in the next database hardening pass.',
  });

  steps.push({
    name: 'seed-baseline',
    ok: true,
    message: 'Baseline seed hook ready. Default catalog/order/theme seed will be enabled in the next database hardening pass.',
  });

  return {
    ok: true,
    message: 'Tenant database setup checks completed.',
    steps,
  };
}
