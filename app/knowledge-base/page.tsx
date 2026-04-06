'use client';

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

  const load = async () => setArticles(await supportService.listArticles());
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <PageHeader title="Knowledge Base" subtitle="Document internal procedures, storefront guidance, and troubleshooting notes." actions={<PrimaryButton onClick={async () => { if (!title.trim()) return; await supportService.addArticle({ title, category, status: 'Draft', author: 'Admin Ops' }); setTitle(''); await load(); }}>Add Article</PrimaryButton>} />
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
