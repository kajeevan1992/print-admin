export function LimitUsageBar({
  label,
  used,
  limit,
  suffix = ''
}: {
  label: string;
  used: number;
  limit: number;
  suffix?: string;
}) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span style={{ color: 'var(--theme-text-muted)' }}>{label}</span>
        <span className="font-medium">
          {used}{suffix} / {limit}{suffix}
        </span>
      </div>
      <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-2 rounded-full"
          style={{
            width: `${pct}%`,
            background: pct >= 90 ? 'var(--theme-danger)' : pct >= 70 ? 'var(--theme-warning)' : 'var(--theme-primary)'
          }}
        />
      </div>
    </div>
  );
}
