'use client';

import { useEffect, useState } from 'react';
import type { NavItem } from './types';
import { storeHref } from './theme-helpers';
import ChromeSearchModal from './ChromeSearchModal';

export default function SearchHost({ navItems, storeBase }: { navItems: NavItem[]; storeBase: string }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('open-holo-search', show);
    window.addEventListener('storefront:search', show);
    return () => {
      window.removeEventListener('open-holo-search', show);
      window.removeEventListener('storefront:search', show);
    };
  }, []);
  const suggestions = navItems.map((item) => [item.label, item.path] as [string, string]);
  const go = (path: string) => { window.location.href = storeHref(storeBase, path); };
  return <ChromeSearchModal open={open} searchTerm={term} setSearchTerm={setTerm} suggestions={suggestions} onClose={() => setOpen(false)} onNavigate={go} />;
}
