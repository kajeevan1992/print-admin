export function TenantPlanSummary() {
  return (
    <div className="space-y-4">
      <div
        className="rounded-3xl border p-5"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
      >
        <p className="text-sm font-semibold">Activation snapshot</p>
        <div className="mt-4 grid gap-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          <p>• 1 tenant active on Growth</p>
          <p>• 1 tenant on trial nearing billing</p>
          <p>• 1 tenant pending activation</p>
          <p>• 1 tenant suspended for manual attention</p>
        </div>
      </div>

      <div
        className="rounded-3xl border p-5"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
      >
        <p className="text-sm font-semibold">Next backend stage</p>
        <div className="mt-4 grid gap-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          <p>• connect plans to real subscription records</p>
          <p>• enforce storefront/user/storage limits at tenant level</p>
          <p>• add activation hooks for domain/theme provisioning</p>
          <p>• connect billing dates, trials, and suspension rules</p>
        </div>
      </div>
    </div>
  );
}
