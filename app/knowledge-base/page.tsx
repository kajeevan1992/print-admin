'use client';


export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { PrimaryButton } from '@/components/ui/buttons';
import { supportService } from '@/services/support.service';
import type { KnowledgeArticle } from '@/data/support';

export default function Page() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [syncStatus, setSyncStatus] = useState<{ mode: 'database' | 'local'; error: string }>({ mode: 'local', error: '' });

  const load = async () => {
    const next = await supportService.listArticles();
    setArticles(next);
    setSyncStatus(supportService.getSyncStatus());
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <PageHeader title="Knowledge Base" subtitle="Document internal procedures, storefront guidance, and troubleshooting notes." actions={<PrimaryButton onClick={async () => { if (!title.trim()) return; await supportService.addArticle({ title, category, status: 'Draft', author: 'Admin Ops' }); setTitle(''); await load(); }}>Add Article</PrimaryButton>} />
      <div className="rounded-xl border border-border bg-panel px-4 py-3 text-sm">
        <span className={syncStatus.mode === 'database' ? 'text-emerald-300' : 'text-amber-300'}>
          {syncStatus.mode === 'database' ? 'Database connected' : 'Local fallback'}
        </span>
        <span className="ml-2 text-textMuted">
          {syncStatus.mode === 'database' ? 'Knowledge base articles sync through internal API.' : (syncStatus.error ? 'Knowledge base API fallback active: ' + syncStatus.error : 'Knowledge base API fallback active.')}
        </span>
      </div>
      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
          <Input placeholder="Article title..." value={title} onChange={(e) => setTitle(e.target.value)} />
          <Select value={category} options={['General', 'Launch', 'Pricing', 'Production', 'Users']} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <div className="space-y-3">
          {articles.map((article) => <div key={article.id} className="rounded-xl border border-border p-4"><p className="font-semibold">{article.title}</p><p className="text-sm text-textMuted">{article.id} · {article.category} · {article.status} · Updated {article.updatedAt}</p></div>)}
        </div>
      </Card>
    </div>
  );
}
