export function ProductPreviewPanel() {
  return (
    <div
      className="rounded-[2rem] border p-6"
      style={{ borderColor: 'var(--theme-border)', background: 'linear-gradient(135deg, var(--theme-surface), var(--theme-surface-alt))' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Preview area</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            Shared preview shell for gallery, flat artwork previews, 3D views, || template previews.
          </p>
        </div>
        <div className="rounded-full px-3 py-1 text-xs" style={{ background: 'var(--theme-surface)', color: 'var(--theme-text-muted)' }}>
          Preview / gallery
        </div>
      </div>

      <div
        className="mt-5 flex min-h-[320px] items-center justify-center rounded-[1.5rem] border border-dashed"
        style={{ borderColor: 'var(--theme-border)', background: 'rgba(255,255,255,0.02)' }}
      >
        <div className="text-center">
          <p className="text-sm font-medium">Product visual placeholder</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            This panel will later support mockups, upload previews, editor previews, || 3D packaging views.
          </p>
        </div>
      </div>
    </div>
  );
}
