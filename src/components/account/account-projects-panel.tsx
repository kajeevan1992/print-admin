import { savedProjects } from '@/data/customer-account';

export function AccountProjectsPanel() {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Saved projects</p>
        <button
          type="button"
          className="rounded-full border px-3 py-1 text-xs"
          style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
        >
          View all
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {savedProjects.map((project) => (
          <div
            key={project.id}
            className="rounded-2xl border p-4"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}
          >
            <p className="text-sm font-medium">{project.name}</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
              {project.type} · Updated {project.updatedAt}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
              >
                Open
              </button>
              <button
                type="button"
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
              >
                Duplicate
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
