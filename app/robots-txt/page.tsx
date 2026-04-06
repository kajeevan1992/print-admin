'use client';

import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { PrimaryButton } from '@/components/ui/buttons';
import { useEffect, useState } from 'react';

const defaultRobots = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /checkout\n\nSitemap: https://print.example.com/sitemap.xml`;

export default function Page() {
  const [value, setValue] = useState(defaultRobots);

  useEffect(() => {
    const saved = window.localStorage.getItem('ops-robots-txt');
    if (saved) setValue(saved);
  }, []);

  const save = () => {
    window.localStorage.setItem('ops-robots-txt', value);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Robots.txt"
        subtitle="Manage crawler directives, protected paths, and sitemap declarations for your storefront."
        actions={<PrimaryButton onClick={save}>Save Robots.txt</PrimaryButton>}
      />
      <Card className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-text">Robots Configuration</h3>
          <p className="mt-1 text-sm text-textMuted">Changes are stored locally in this admin build so you can validate the editing flow before wiring backend persistence.</p>
        </div>
        <textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="min-h-[420px] w-full rounded-xl border border-border bg-panel px-4 py-3 text-sm text-text outline-none"
        />
      </Card>
    </div>
  );
}
