export function ProductOptionsPanel() {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <p className="text-sm font-semibold">Product options</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span style={{ color: 'var(--theme-text-muted)' }}>Size</span>
          <select
            className="rounded-2xl border px-4 py-3 outline-none"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text)' }}
          >
            <option>Standard</option>
            <option>Premium</option>
            <option>Custom size</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span style={{ color: 'var(--theme-text-muted)' }}>Quantity</span>
          <select
            className="rounded-2xl border px-4 py-3 outline-none"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text)' }}
          >
            <option>100</option>
            <option>250</option>
            <option>500</option>
            <option>1000</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span style={{ color: 'var(--theme-text-muted)' }}>Paper / stock</span>
          <select
            className="rounded-2xl border px-4 py-3 outline-none"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text)' }}
          >
            <option>Standard matte</option>
            <option>Silk</option>
            <option>Premium uncoated</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span style={{ color: 'var(--theme-text-muted)' }}>Turnaround</span>
          <select
            className="rounded-2xl border px-4 py-3 outline-none"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text)' }}
          >
            <option>Standard</option>
            <option>Priority</option>
          </select>
        </label>
      </div>
    </div>
  );
}
