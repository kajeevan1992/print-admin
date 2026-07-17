'use client';

import { useEffect, useMemo, useState } from 'react';
import ChromeSearchModal, { type SearchSuggestion } from './ChromeSearchModal';

function storeParts(storeBase: string) { const parts = String(storeBase || '').split('/').filter(Boolean); const index = Math.max(parts.indexOf('native-stores'), parts.indexOf('theme-preview')); return { tenantSlug: index >= 0 ? parts[index + 1] || '' : '', storeSlug: index >= 0 ? parts[index + 2] || '' : '' }; }

export default function SearchHost({ storeBase }: { navItems?: unknown[]; storeBase: string }) {
  const [open, setOpen] = useState(false); const [term, setTerm] = useState(''); const [loading, setLoading] = useState(false); const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const { tenantSlug, storeSlug } = useMemo(() => storeParts(storeBase), [storeBase]);
  useEffect(() => { const show = () => setOpen(true); window.addEventListener('open-holo-search', show); window.addEventListener('storefront:search', show); return () => { window.removeEventListener('open-holo-search', show); window.removeEventListener('storefront:search', show); }; }, []);
  useEffect(() => {
    if (!open || !tenantSlug || !storeSlug) return;
    const controller = new AbortController(); const timer = window.setTimeout(async () => {
      setLoading(true);
      try { const params = new URLSearchParams({ tenantSlug, storeSlug, q: term, limit: '10' }); const response = await fetch(`/api/native-storefront/catalog-search?${params}`, { signal: controller.signal }); const payload = await response.json().catch(() => null); setSuggestions(Array.isArray(payload?.data?.results) ? payload.data.results : []); }
      catch (error) { if ((error as Error)?.name !== 'AbortError') setSuggestions([]); }
      finally { setLoading(false); }
    }, term ? 180 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, term, tenantSlug, storeSlug]);
  const searchUrl = `${storeBase}/search?q=${encodeURIComponent(term)}`;
  return <ChromeSearchModal open={open} searchTerm={term} setSearchTerm={setTerm} suggestions={suggestions} loading={loading} searchUrl={searchUrl} onClose={() => setOpen(false)} />;
}
