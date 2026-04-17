import { readinessDomains } from '@/data/platform-readiness';
import { ReadinessStatusBadge } from './readiness-status-badge';

export function ReadinessDomainBoard() {
  return (
    <div className="space-y-4">
      {readinessDomains.map((domain) => (
        <div
          key={domain.id}
          className="rounded-3xl border p-5"
          style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{domain.title}</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                {domain.description}
              </p>
            </div>
            <ReadinessStatusBadge status={domain.status} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {domain.items.map((item) => (
              <span
                key={item}
                className="rounded-full px-3 py-1 text-[11px]"
                style={{ background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
