export function TenantDomainSummary() {
  return (
    <div className="space-y-4">
      <div
        className="rounded-3xl border p-5"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
      >
        <p className="text-sm font-semibold">Domain setup summary</p>
        <div className="mt-4 grid gap-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          <p>• 1 tenant fully active on custom domain</p>
          <p>• 1 tenant still using only platform subdomain</p>
          <p>• 1 tenant waiting on DNS/SSL completion</p>
        </div>
      </div>

      <div
        className="rounded-3xl border p-5"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
      >
        <p className="text-sm font-semibold">Superadmin next stage</p>
        <div className="mt-4 grid gap-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          <p>• connect this UI to real tenant records</p>
          <p>• add DNS verification checks and SSL provisioning status</p>
          <p>• store primary-domain routing and redirect rules</p>
          <p>• connect tenant theme assignment and plan-based limits</p>
        </div>
      </div>
    </div>
  );
}
