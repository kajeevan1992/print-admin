'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { ProductSectionCard } from '@/modules/products/components/product-section-card';
import { Select } from '@/components/forms/select';
import { Button } from '@/components/ui/buttons';
import { themesService } from '@/services/themes.service';
import { channelsService } from '@/services/channels.service';
import { EmptyModuleState } from '@/modules/products/components/empty-module-state';
import type { Theme } from '@/modules/themes/types';

export function ThemeDetailPage({ id }: { id: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [channels, setChannels] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([themesService.getTheme(id), channelsService.listChannels()])
      .then(([themeResponse, channelsResponse]) => {
        setTheme(themeResponse.data);
        const items = channelsResponse.data.items.map((channel) => ({ id: channel.id, name: channel.name }));
        setChannels(items);
        setSelectedChannel(items[0]?.id ?? '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load theme'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <ProductSectionCard title="Loading">Loading theme...</ProductSectionCard>;
  if (error) return <ProductSectionCard title="Error"><p className="text-red-300">{error}</p></ProductSectionCard>;
  if (!theme) return <EmptyModuleState title="Theme not found" description="This theme may have been removed || unpublished." />;

  return (
    <div>
      <PageHeader title={theme.name} subtitle={`Version ${theme.version} · ${theme.author}`} />
      <ProductSectionCard title="Theme Information">
        <p className="mb-3 text-sm text-textMuted">{theme.description}</p>
        <ul className="mb-4 list-disc pl-5 text-sm text-textMuted">
          {theme.supportedFeatures.map((feature) => <li key={feature}>{feature}</li>)}
        </ul>
        <div className="flex gap-2">
          <Select options={channels.map((channel) => channel.id)} value={selectedChannel} onChange={(e) => setSelectedChannel(e.target.value)} />
          <Button onClick={() => themesService.assignThemeToChannel(selectedChannel, theme.id)}>Assign to Channel</Button>
        </div>
      </ProductSectionCard>
      <ProductSectionCard title="Future Theme Config">
        <p className="text-sm text-textMuted">Theme settings API will be added in a future release.</p>
      </ProductSectionCard>
    </div>
  );
}
