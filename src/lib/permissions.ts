export function isOwner(role?: string) {
  return role === 'super_admin';
}

export function canManageSettings(role?: string) {
  return role === 'super_admin' || role === 'tenant_admin';
}

export function canManageOperations(role?: string) {
  return role === 'super_admin' || role === 'tenant_admin' || role === 'ops_manager';
}

export function canDeleteRecords(role?: string) {
  return role === 'super_admin' || role === 'tenant_admin';
}
