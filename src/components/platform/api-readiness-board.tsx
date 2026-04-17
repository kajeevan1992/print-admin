import { apiReadinessModules } from '@/data/platform-readiness';
import { ReadinessStatusBadge } from './readiness-status-badge';

export function ApiReadinessBoard() {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <p className="text-sm font-semibold">API readiness modules</p>
      <div className="mt-4 space-y-3">
        {apiReadinessModules.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border p-4"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{item.module}</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                  {item.scope}
                </p>
              </div>
              <ReadinessStatusBadge status={item.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
