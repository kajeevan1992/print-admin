export type DatabaseManagerRecord = {
  id: string;
  tenantId: string;
  siteId?: string;
  scope: 'tenant' | 'site';
  label: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password?: string;
  sslMode: 'disable' | 'prefer' | 'require';
  status: 'untested' | 'connected' | 'failed';
  lastTestedAt?: string;
};
