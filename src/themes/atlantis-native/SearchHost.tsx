'use client';

import { useEffect, useMemo, useState } from 'react';
import type { NavItem } from './types';
import ChromeSearchModal, { type ChromeSearchSuggestion } from './ChromeSearchModal';

export default function SearchHost({ tenantSlug, storeSlug, navItems, storeBase }: { tenantSlug: string; storeSlug: string; navItems: NavItem[]; storeBase: string }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [liveSuggestions, setLiveSuggestions] = useState<ChromeSearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener('open-holo-search', show);
    window.addEventListener('storefront:search', show);
    return () => {
      window.removeEventListener('open-holo-search', show);
      window.removeEventListener('storefront:search', show);
    };
  }, []);

  useEffect(() => {
    const query = term.trim();
    if (query.length < 2) { setLiveSuggestions([]); setLoading(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ tenantSlug, storeSlug, q: query, limit: '8' });
        const response = await fetch(`/api/native-storefront/catalog-search?${params.toString()}`, { signal: controller.signal, headers: { Accept: 'application/json' } });
        const payload = await response.json().catch(() => ({}));
        const suggestions = Array.isArray(payload?.result?.suggestions) ? payload.result.suggestions : [];
        setLiveSuggestions(suggestions.map((item: any) => ({ kind: item.kind, title: item.title, subtitle: item.kind === 'category' ? `${item.productCount || 0} products` : `${item.categoryTitle || ''}${item.price ? ` · ${item.price}` : ''}`, href: item.href, image: item.image || '', sku: item.sku || '' })));
      } catch (error) {
        if ((error as any)?.name !== 'AbortError') setLiveSuggestions([]);
      } finally { setLoading(false); }
    }, 180);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [tenantSlug, storeSlug, term]);

  const fallbackSuggestions = useMemo<ChromeSearchSuggestion[]>(() => navItems.slice(0, 10).map((item) => ({ kind: 'navigation', title: item.label, subtitle: 'Browse this catalogue section', href: `${storeBase}${item.path === '/' ? '' : item.path}` })), [navItems, storeBase]);
  const suggestions = term.trim().length >= 2 ? liveSuggestions : fallbackSuggestions;
  const go = (href: string) => { window.location.href = href; };
  const submit = (query: string) => { window.location.href = `${storeBase}/search${query ? `?q=${encodeURIComponent(query)}` : ''}`; };
  return <ChromeSearchModal open={open} searchTerm={term} setSearchTerm={setTerm} suggestions={suggestions} loading={loading} onClose={() => setOpen(false)} onNavigate={go} onSubmit={submit} />;
}
