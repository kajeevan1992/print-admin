'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { BRAND } from './theme-helpers';

export default function AtlantisHeaderSurface({ children, search, studio = false }: { children: ReactNode; search?: ReactNode; studio?: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const sync = () => setScrolled(window.scrollY > 10);
    sync();
    window.addEventListener('scroll', sync, { passive: true });
    return () => window.removeEventListener('scroll', sync);
  }, []);

  return <header className={`sticky top-0 z-40 border-b backdrop-blur transition-all duration-300 ${scrolled ? 'shadow-[0_12px_30px_rgba(0,0,0,0.06)]' : ''}`} style={{ borderColor: studio ? 'rgba(255,255,255,0.12)' : BRAND.line, backgroundColor: studio ? 'rgba(17,19,21,0.96)' : 'rgba(255,255,255,0.95)' }}>
    <div className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 lg:px-8">
      <div className="relative">
        <div className={`grid grid-cols-[auto_1fr_auto] items-center gap-6 transition-all duration-300 ${scrolled ? 'h-[64px]' : 'h-[74px]'}`}>{children}</div>
      </div>
    </div>
    {search}
  </header>;
}
