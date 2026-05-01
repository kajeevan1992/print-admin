'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Plus, Save, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type Product = { id: string; name: string; slug: string; categoryId?: string | null; priceFromMinor?: number; currency?: string; isActive?: boolean; productType?: string; metadataJson?: Record<string, any> };
type Rule = Record<string, any>;

const ruleTemplates: Array<{ id: string; label: string; rule: Rule }> = [
  {
    id: 'foil-soft-touch',
    label: 'Foil requires soft touch lamination',
    rule: {
      id: 'foil-requires-soft-touch',
      name: 'Foil requires soft touch lamination',
      match: 'all',
      when: [{ option: 'finish', operator: 'equals', value: 'foil' }],
      actions: [
        { type: 'forceValue', option: 'lamination', value: 'soft-touch', message: 'Foil requires soft touch lamination. We selected it for you.' },
        { type: 'message', severity: 'info', text: 'Foil adds extra production time and needs soft touch lamination.' },
      ],
    },
  },
  {
    id: 'spotuv-block-uncoated',
    label: 'Block Spot UV on uncoated paper',
    rule: {
      id: 'spotuv-block-uncoated',
      name: 'Spot UV not available on uncoated paper',
      match: 'all',
      when: [
        { option: 'paper', operator: 'equals', value: 'uncoated' },
        { option: 'finish', operator: 'equals', value: 'spot-uv' },
      ],
      actions: [{ type: 'block', field: 'finish', text: 'Spot UV is only available on laminated silk stocks.' }],
    },
  },
  {
    id: 'banner-panel-split',
    label: 'Banner roll-width limit / joined panels',
    rule: {
      id: 'banner-roll-width-limit',
      name: 'Banner roll width and joined panel warning',
      match: 'any',
      when: [
        { field: 'widthMm', operator: 'greaterThan', value: 1200 },
        { field: 'heightMm', operator: 'greaterThan', value: 1200 },
      ],
      actions: [
        { type: 'suggestPanels', widthField: 'widthMm', heightField: 'heightMm', maxRollWidthMm: 1200, joinCostMinor: 1500, severity: 'warning', message: 'Large banners may need joined panels. The seam may be visible.' },
      ],
    },
  },
  {
    id: 'inside-window-sticker',
    label: 'Window sticker inside-facing-out guidance',
    rule: {
      id: 'inside-window-sticker-guidance',
      name: 'Inside-facing-out sticker guidance',
      match: 'all',
      when: [{ option: 'application', operator: 'equals', value: 'inside-facing-out' }],
      actions: [
        { type: 'forceValue', option: 'adhesiveSide', value: 'front-adhesive', message: 'Inside-facing-out stickers need front adhesive.' },
        { type: 'message', severity: 'info', text: 'Artwork will be mirrored so it reads correctly from outside.' },
      ],
    },
  },
  {
    id: 'booklet-pages-binding',
    label: 'Booklet high page count requires perfect binding',
    rule: {
      id: 'booklet-pages-perfect-binding',
      name: 'High page count requires perfect binding',
      match: 'all',
      when: [{ option: 'pages', operator: 'greaterThan', value: 40 }],
      actions: [
        { type: 'forceValue', option: 'binding', value: 'perfect-bound', message: 'Booklets over 40 pages require perfect binding.' },
        { type: 'requireField', field: { id: 'spineText', label: 'Spine text', type: 'text' } },
      ],
    },
  },
];

function cloneRule(rule: Rule) {
  return JSON.parse(JSON.stringify(rule));
}

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function parseJson(value: string, fallback: any) {
  try { return JSON.parse(value); } catch { return fallback; }
}

export default function ProductRulesBuilderPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedRuleIndex, setSelectedRuleIndex] = useState(0);
  const [conditionJson, setConditionJson] = useState('[]');
  const [actionJson, setActionJson] = useState('[]');
  const [testJson, setTestJson] = useState('{\n  "selections": {\n    "finish": "foil",\n    "lamination": "matt"\n  },\n  "customFields": {\n    "widthMm": 1500,\n    "heightMm": 5000\n  }\n}');
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedProduct = useMemo(() => products.find((product) => product.id === selectedId) || null, [products, selectedId]);
  const selectedRule = rules[selectedRuleIndex] || null;

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/internal/catalog/products', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error(json.error || 'Products failed to load.');
      const items = json.data?.items || [];
      setProducts(items);
      const first = selectedId ? items.find((item: Product) => item.id === selectedId) : items[0];
      if (first) selectProduct(first.id, items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules builder.');
    } finally {
      setLoading(false);
    }
  }

  function selectProduct(id: string, sourceProducts = products) {
    const product = sourceProducts.find((item) => item.id === id);
    setSelectedId(id);
    const nextRules = Array.isArray(product?.metadataJson?.rules) ? product!.metadataJson!.rules : [];
    setRules(nextRules);
    setSelectedRuleIndex(0);
    setConditionJson(pretty(nextRules[0]?.when || []));
    setActionJson(pretty(nextRules[0]?.actions || []));
    setTestResult(null);
  }

  useEffect(() => { load(); }, []);

  function addRule(templateId = 'foil-soft-touch') {
    const template = ruleTemplates.find((item) => item.id === templateId) || ruleTemplates[0];
    const next = [...rules, cloneRule(template.rule)];
    setRules(next);
    setSelectedRuleIndex(next.length - 1);
    setConditionJson(pretty(template.rule.when));
    setActionJson(pretty(template.rule.actions));
  }

  function updateRulePatch(patch: Rule) {
    const next = [...rules];
    next[selectedRuleIndex] = { ...(next[selectedRuleIndex] || {}), ...patch };
    setRules(next);
  }

  function applyEditorJson() {
    updateRulePatch({ when: parseJson(conditionJson, []), actions: parseJson(actionJson, []) });
  }

  function removeRule(index: number) {
    const next = rules.filter((_, i) => i !== index);
    setRules(next);
    setSelectedRuleIndex(0);
    setConditionJson(pretty(next[0]?.when || []));
    setActionJson(pretty(next[0]?.actions || []));
  }

  async function saveRules() {
    if (!selectedProduct) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      applyEditorJson();
      const currentRules = rules.map((rule, index) => index === selectedRuleIndex ? { ...rule, when: parseJson(conditionJson, []), actions: parseJson(actionJson, []) } : rule);
      const metadataJson = { ...(selectedProduct.metadataJson || {}), rules: currentRules, rulesVersion: 'v327' };
      const res = await fetch('/api/internal/catalog/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedProduct.id,
          name: selectedProduct.name,
          slug: selectedProduct.slug,
          categoryId: selectedProduct.categoryId ?? null,
          priceFromMinor: selectedProduct.priceFromMinor ?? 0,
          currency: selectedProduct.currency || 'GBP',
          isActive: selectedProduct.isActive ?? false,
          productType: selectedProduct.productType,
          metadataJson,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error(json.error || 'Rules save failed.');
      setMessage('Rules saved to product metadata.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rules save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function testRules() {
    if (!selectedProduct) return;
    setError('');
    setTestResult(null);
    try {
      await saveRules();
      const body = { productId: selectedProduct.id, ...parseJson(testJson, {}) };
      const res = await fetch('/api/internal/catalog/evaluate-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error(json.error?.message || 'Rule test failed.');
      setTestResult(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rule test failed.');
    }
  }

  return <div className="space-y-6">
    <PageHeader title="Product Rules Builder" subtitle="Build frontend behaviour rules for print options: force values, block impossible combinations, show warnings, add price adjustments and handle custom size limits." />

    <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">v327 option logic</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Rules saved into metadataJson.rules</h2>
          <p className="mt-1 text-sm text-textMuted">Hosted theme calls evaluate-rules whenever a customer changes options.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => load()} disabled={loading} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.05]">Refresh</button>
          <button onClick={saveRules} disabled={saving || !selectedProduct} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"><Save size={16}/>Save rules</button>
        </div>
      </div>
    </Card>

    {error ? <div className="flex items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100"><AlertTriangle size={18}/>{error}</div> : null}
    {message ? <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100"><CheckCircle2 size={18}/>{message}</div> : null}

    <div className="grid gap-4 xl:grid-cols-[320px_1fr_420px]">
      <Card>
        <h3 className="text-sm font-semibold text-white">Products</h3>
        <div className="mt-4 space-y-2">
          {products.map((product) => <button key={product.id} onClick={() => selectProduct(product.id)} className={`w-full rounded-2xl border p-3 text-left transition ${selectedId === product.id ? 'border-sky-400/40 bg-sky-400/10' : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06]'}`}>
            <p className="text-sm font-semibold text-white">{product.name}</p>
            <p className="mt-1 text-xs text-textMuted">/{product.slug}</p>
            <p className="mt-2 text-xs text-textMuted">{Array.isArray(product.metadataJson?.rules) ? product.metadataJson!.rules.length : 0} rule(s)</p>
          </button>)}
          {!products.length ? <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-textMuted">No products found.</p> : null}
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Rules for {selectedProduct?.name || 'product'}</h3>
            <p className="mt-1 text-sm text-textMuted">Choose a rule, edit conditions/actions, then save.</p>
          </div>
          <Select options={ruleTemplates.map((item) => ({ value: item.id, label: item.label }))} onChange={(e) => addRule(e.target.value)} value="" />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            {rules.map((rule, index) => <button key={`${rule.id}-${index}`} onClick={() => { setSelectedRuleIndex(index); setConditionJson(pretty(rule.when || [])); setActionJson(pretty(rule.actions || [])); }} className={`w-full rounded-2xl border p-3 text-left ${selectedRuleIndex === index ? 'border-sky-400/40 bg-sky-400/10' : 'border-white/8 bg-white/[0.03]'}`}>
              <div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold text-white">{rule.name || rule.id}</p><Trash2 size={14} className="text-rose-200" onClick={(e) => { e.stopPropagation(); removeRule(index); }}/></div>
              <p className="mt-1 text-xs text-textMuted">{rule.when?.length || 0} condition(s) · {rule.actions?.length || 0} action(s)</p>
            </button>)}
            {!rules.length ? <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-textMuted">No rules yet. Choose a template above to add one.</div> : null}
          </div>

          <div className="space-y-4">
            <label className="space-y-2 block"><span className="text-sm font-medium">Rule name</span><Input value={selectedRule?.name || ''} onChange={(e) => updateRulePatch({ name: e.target.value })}/></label>
            <label className="space-y-2 block"><span className="text-sm font-medium">Rule id</span><Input value={selectedRule?.id || ''} onChange={(e) => updateRulePatch({ id: e.target.value })}/></label>
            <label className="space-y-2 block"><span className="text-sm font-medium">Match mode</span><Select options={[{ value: 'all', label: 'All conditions' }, { value: 'any', label: 'Any condition' }]} value={selectedRule?.match || 'all'} onChange={(e) => updateRulePatch({ match: e.target.value })}/></label>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="space-y-2 block"><span className="text-sm font-medium">When conditions JSON</span><textarea value={conditionJson} onChange={(e) => setConditionJson(e.target.value)} onBlur={applyEditorJson} className="min-h-[260px] w-full rounded-2xl border border-white/10 bg-black/30 p-4 font-mono text-xs text-white outline-none" /></label>
          <label className="space-y-2 block"><span className="text-sm font-medium">Actions JSON</span><textarea value={actionJson} onChange={(e) => setActionJson(e.target.value)} onBlur={applyEditorJson} className="min-h-[260px] w-full rounded-2xl border border-white/10 bg-black/30 p-4 font-mono text-xs text-white outline-none" /></label>
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <div className="flex items-center gap-2 text-white"><Sparkles size={17}/><h3 className="font-semibold">Rule test</h3></div>
          <p className="mt-2 text-xs leading-5 text-textMuted">Test with selections/custom fields. This calls the real evaluate-rules API.</p>
          <textarea value={testJson} onChange={(e) => setTestJson(e.target.value)} className="mt-4 min-h-[220px] w-full rounded-2xl border border-white/10 bg-black/30 p-4 font-mono text-xs text-white outline-none" />
          <button onClick={testRules} disabled={!selectedProduct || saving} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"><Wand2 size={16}/>Save & test rules</button>
        </Card>

        <Card>
          <p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Evaluation result</p>
          <pre className="mt-4 max-h-[520px] overflow-auto rounded-2xl border border-white/8 bg-black/30 p-4 text-[11px] leading-5 text-textMuted">{testResult ? pretty(testResult) : 'No test run yet.'}</pre>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-white"><Plus size={17}/><h3 className="font-semibold">Supported actions</h3></div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-textMuted">{['forceValue','hideOption','disableValue','requireField','addPrice','message','block','suggestPanels'].map((item) => <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{item}</span>)}</div>
        </Card>
      </div>
    </div>
  </div>;
}
