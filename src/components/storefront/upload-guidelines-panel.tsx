export function UploadGuidelinesPanel() {
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}
    >
      <p className="text-sm font-semibold">Artwork guidelines</p>
      <div className="mt-4 grid gap-3 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
        <p>• supply print-ready PDF || supported design source files</p>
        <p>• include bleed and safe zone where needed</p>
        <p>• outline fonts || embed them before export</p>
        <p>• use CMYK artwork for print-critical products</p>
        <p>• dielines and special finishes should be clearly marked</p>
      </div>
    </div>
  );
}
