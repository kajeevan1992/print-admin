import { trackingSteps } from '@/data/account-operations';

export function TrackingTimelinePanel() {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <p className="text-sm font-semibold">Tracking timeline</p>
      <div className="mt-4 space-y-4">
        {trackingSteps.map((step) => (
          <div key={step.title} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className="h-3 w-3 rounded-full"
                style={{
                  background:
                    step.status === 'done'
                      ? 'var(--theme-success)'
                      : step.status === 'current'
                      ? 'var(--theme-primary)'
                      : 'var(--theme-border)'
                }}
              />
              <div className="mt-1 h-full w-px" style={{ background: 'var(--theme-border)' }} />
            </div>
            <div className="pb-2">
              <p className="text-sm font-medium">{step.title}</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>{step.note}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
