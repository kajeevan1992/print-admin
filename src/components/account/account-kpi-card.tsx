type AccountKpiCardProps = {
  label: string;
  value: string;
  hint: string;
};

export function AccountKpiCard({ label, value, hint }: AccountKpiCardProps) {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <p className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--theme-text-muted)' }}>
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>{hint}</p>
    </div>
  );
}
