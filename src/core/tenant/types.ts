export type TenantDatabaseScope = 'tenant' | 'site';
export type TenantDatabaseStatus = 'untested' | 'connected' | 'failed';

export type TenantDatabaseConnection = {
  id: string;
  tenantId: string;
  siteId?: string;
  scope: TenantDatabaseScope;
  label: string;
  provider: 'postgres';
  host: string;
  port: number;
  database: string;
  username: string;
  encryptedPassword?: string;
  sslMode: 'disable' | 'prefer' | 'require';
  status: TenantDatabaseStatus;
  lastTestedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type TenantContext = {
  tenantId: string;
  siteId?: string;
  databaseConnectionId?: string;
};
