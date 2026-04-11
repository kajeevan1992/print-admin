export function BaseModal({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-[28px] border border-white/8 bg-panel/95 p-6 shadow-[0_40px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold tracking-[-0.02em] text-white">{title}</h3>
            <p className="mt-1 text-sm text-textMuted">A guided flow to help you move faster with fewer clicks.</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-white/8 px-3 py-2 text-sm text-textMuted transition hover:bg-panelMuted hover:text-text">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}
