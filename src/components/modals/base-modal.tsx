'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

export function BaseModal({
  open,
  onClose,
  title,
  children
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Close modal backdrop"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-[2px]"
      />

      <div className="relative z-[101] flex min-h-full items-center justify-center p-4">
        <div
          className="w-full max-w-3xl rounded-2xl border border-border bg-panel shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold text-text">{title}</h2>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border p-2 text-textMuted transition hover:bg-panelMuted hover:text-text"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[80vh] overflow-y-auto px-5 py-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
