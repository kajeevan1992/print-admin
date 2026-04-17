import { artworkUploadSeed } from '@/data/artwork-upload-foundation';
import { UploadStatusBadge } from './upload-status-badge';

export function UploadRecordsPanel() {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Recent uploads</p>
        <button
          type="button"
          className="rounded-full border px-3 py-1 text-xs"
          style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
        >
          View all
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {artworkUploadSeed.map((file) => (
          <div
            key={file.id}
            className="rounded-2xl border p-4"
            style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{file.fileName}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                  {file.fileType} · {file.fileSize} · {file.uploadedAt}
                </p>
              </div>
              <UploadStatusBadge status={file.status} />
            </div>

            <p className="mt-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
              {file.note}
            </p>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
              >
                Attach to order
              </button>
              <button
                type="button"
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
              >
                Replace file
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
