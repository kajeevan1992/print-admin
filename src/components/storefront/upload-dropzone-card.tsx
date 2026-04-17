'use client';

export function UploadDropzoneCard() {
  return (
    <div
      className="rounded-[2rem] border border-dashed p-8 text-center"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <p className="text-sm font-semibold">Upload artwork</p>
      <p className="mt-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
        Drag and drop files here || browse for artwork. This is the frontend shell for future storage and order attachment.
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs">
        {['PDF', 'AI', 'EPS', 'PSD', 'JPG', 'PNG'].map((type) => (
          <span
            key={type}
            className="rounded-full px-3 py-1"
            style={{ background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}
          >
            {type}
          </span>
        ))}
      </div>

      <button
        type="button"
        className="mt-6 rounded-full px-5 py-3 text-sm font-medium"
        style={{ background: 'var(--theme-primary)', color: 'var(--theme-primary-text)' }}
      >
        Choose files
      </button>
    </div>
  );
}
