'use client';

import { useEffect, useState } from 'react';
import { Tabs } from '@/components/ui/tabs';
import { PageHeader } from '@/components/ui/page-header';
import { ProductSectionCard } from '@/modules/products/components/product-section-card';
import { Button } from '@/components/ui/buttons';
import { channelsService } from '@/services/channels.service';
import { productsService } from '@/services/products.service';
import { EmptyModuleState } from '@/modules/products/components/empty-module-state';
import type { Channel } from '@/modules/channels/types';
import type { Product } from '@/modules/products/types';

const tabs = ['General', 'Theme', 'Domain', 'API Settings', 'Products', 'Orders'];

export function ChannelDetailPage({ id }: { id: string }) {
  const [active, setActive] = useState(tabs[0]);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [channelResponse, productsResponse] = await Promise.all([
          channelsService.getChannel(id),
          productsService.getProducts()
        ]);

        setChannel(channelResponse.data);
        setProducts(productsResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load channel');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  if (loading) {
    return <ProductSectionCard title="Loading">Loading channel...</ProductSectionCard>;
  }

  if (error) {
    return (
      <ProductSectionCard title="Error">
        <p className="text-red-300">{error}</p>
      </ProductSectionCard>
    );
  }

  if (!channel) {
    return (
      <EmptyModuleState
        title="Channel not found"
        description="This channel may have been removed or renamed."
      />
    );
  }

  const linkedProducts = products.filter(
    (product) => product.global || product.channelIds?.includes(channel.id)
  );

  return (
    <div>
      <PageHeader
        title={channel.name}
        subtitle={`/${channel.slug} · ${channel.isHeadless ? 'Headless' : 'Hosted'} channel`}
        actions={<Button>Edit Channel</Button>}
      />
      <Tabs tabs={tabs} active={active} onChange={setActive} />

      {active === 'General' && (
        <ProductSectionCard title="General">
          <p className="text-sm text-textMuted">
            Currency: {channel.currency} · Locale: {channel.locale} · Status: {channel.status}
          </p>
        </ProductSectionCard>
      )}

      {active === 'Theme' && (
        <ProductSectionCard title="Theme">
          <p className="text-sm text-textMuted">Theme ID: {channel.themeId}</p>
        </ProductSectionCard>
      )}

      {active === 'Domain' && (
        <ProductSectionCard title="Domain">
          <p className="text-sm text-textMuted">
            {channel.domain || 'No custom domain attached'}
          </p>
        </ProductSectionCard>
      )}

      {active === 'API Settings' && (
        <ProductSectionCard title="API Settings">
          <p className="mb-3 text-sm text-textMuted">
            Use this API to build custom frontends.
          </p>
          <div className="space-y-2 text-sm">
            <p>
              Public Key: {channel.publicApiKey} <button className="text-accent">Copy</button>
            </p>
            <p>
              Private Key: {channel.privateApiKey} <button className="text-accent">Copy</button>
            </p>
            <p>Endpoint: /api/channel/{channel.slug}</p>
          </div>
        </ProductSectionCard>
      )}

      {active === 'Products' && (
        <ProductSectionCard title="Linked Products">
          <p className="text-sm text-textMuted">
            {linkedProducts.length} products available in this channel.
          </p>
        </ProductSectionCard>
      )}

      {active === 'Orders' && (
        <ProductSectionCard title="Orders">
          <p className="text-sm text-textMuted">
            Orders module placeholder for channel-specific order feeds.
          </p>
        </ProductSectionCard>
      )}
    </div>
  );
}
