export function PlatformReadinessSummary() {
  return (
    <div className="space-y-4">
      <div
        className="rounded-3xl border p-5"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
      >
        <p className="text-sm font-semibold">What is done</p>
        <div className="mt-4 grid gap-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          <p>• storefront browsing, checkout, uploads, lifecycle, and account flows</p>
          <p>• admin operations controls</p>
          <p>• superadmin domain and plan control surfaces</p>
          <p>• tenant-aware storefront isolation groundwork</p>
        </div>
      </div>

      <div
        className="rounded-3xl border p-5"
        style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
      >
        <p className="text-sm font-semibold">Immediate next implementation</p>
        <div className="mt-4 grid gap-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          <p>• define database schema</p>
          <p>• wire auth and tenant resolution first</p>
          <p>• connect products, orders, and artwork after auth</p>
          <p>• replace seed data route by route</p>
        </div>
      </div>
    </div>
  );
}
