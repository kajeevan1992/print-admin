'use client';

export function UploadOrderAttachmentPanel() {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <p className="text-sm font-semibold">Attach artwork to workflow</p>
      <div className="mt-4 grid gap-3">
        {[
          ['New order', 'Send uploaded artwork into the order flow after checkout or quote approval.'],
          ['Existing order', 'Attach updated files to a live order or production job.'],
          ['Approval request', 'Submit artwork for review before print or customer sign-off.']
        ].map(([title, body], idx) => (
          <button
            key={title}
            type="button"
            className="rounded-2xl border px-4 py-3 text-left"
            style={{
              borderColor: idx === 0 ? 'var(--theme-primary)' : 'var(--theme-border)',
              background: idx === 0 ? 'var(--theme-surface-alt)' : 'var(--theme-surface)'
            }}
          >
            <p className="font-medium">{title}</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>{body}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
