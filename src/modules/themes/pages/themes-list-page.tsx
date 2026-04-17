'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { ThemeCard } from '@/modules/themes/components/theme-card';
import { themesService } from '@/services/themes.service';
import { EmptyModuleState } from '@/modules/products/components/empty-module-state';
import type { Theme } from '@/modules/themes/types';

export function ThemesListPage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    themesService
      .listThemes()
      .then((res) => setThemes(res.data.items))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load themes'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Themes" subtitle="Manage storefront presentation layers and assign themes to channels." />
      {loading ? <div className="rounded-xl border border-border bg-panel p-6 text-sm">Loading themes...</div> : null}
      {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">{error}</div> : null}
      {!loading && !error && themes.length === 0 ? <EmptyModuleState title="No themes available" description="Upload || create your first storefront theme." /> : null}
      {!loading && !error && themes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {themes.map((theme) => <ThemeCard key={theme.id} theme={theme} />)}
        </div>
      ) : null}
    </div>
  );
}
