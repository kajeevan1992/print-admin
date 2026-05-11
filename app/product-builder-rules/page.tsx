'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Plus, Save, Trash2, Wand2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';

type Product = { id: string; name: string; slug: string; categoryId?: string | null; priceFromMinor?: number; currency?: string; isActive?: boolean; productType?: string; metadataJson?: Record<string, any> };
type Rule = Record<string, any>;
type OptionValue = { id: string; label?: string; value?: string; badge?: string; disabled?: boolean };
type OptionGroup = { id: string; label?: string; selector?: string; values?: OptionValue[] };

const operators = [
  { value: 'equals', label: 'equals' },
  { value: 'notEquals', label: 'does not equal' },
  { value: 'in', label: 'is one of' },
  { value: 'notIn', label: 'is not one of' },
  { value: 'greaterThan', label: 'greater than' },
  { value: 'greaterThanOrEqual', label: 'greater than or equal' },
  { value: 'lessThan', label: 'less than' },
  { value: 'lessThanOrEqual', label: 'less than or equal' },
  { value: 'exists', label: 'exists' },
  { value: 'empty', label: 'is empty' },
];

const actionTypes = [
  { value: 'forceValue', label: 'Force option value' },
  { value: 'message', label: 'Show message' },
  { value: 'block', label: 'Block checkout' },
  { value: 'disableValue', label: 'Disable value' },
  { value: 'hideOption', label: 'Hide option group' },
  { value: 'addPrice', label: 'Add price adjustment' },
  { value: 'suggestPanels', label: 'Suggest joined panels' },
  { value: 'requireField', label: 'Require extra field' },
];

const severities = [
  { value: 'info', label: 'Info' },
  { value: 'recommended', label: 'Recommended' },
  { value: 'warning', label: 'Warning' },
  { value: 'blocking', label: 'Blocking' },
];

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function pretty(value: unknown) { return JSON.stringify(value, null, 2); }
function optionGroups(product: Product | null): OptionGroup[] {
  const meta = product?.metadataJson || {};
  const groups = Array.isArray(meta.optionGroups) ? meta.optionGroups : Array.isArray(meta.options) ? meta.options : [];
  return groups.map((group: any) => ({ id: group.id, label: group.label || group.name || group.id, selector: group.selector || group.type || 'dropdown', values: Array.isArray(group.values) ? group.values : [] })).filter((group: OptionGroup) => group.id);
}
function fieldChoices(product: Product | null) {
  const groups = optionGroups(product).map((group) => ({ value: group.id, label: group.label || group.id }));
  const custom = [
    { value: 'widthMm', label: 'Custom width mm' },
    { value: 'heightMm', label: 'Custom height mm' },
    { value: 'quantity', label: 'Quantity' },
    { value: 'pages', label: 'Pages' },
    { value: 'artworkUploaded', label: 'Artwork uploaded' },
    { value: 'deliveryService', label: 'Delivery service' },
  ];
  return [...groups, ...custom].filter((item, index, arr) => arr.findIndex((next) => next.value === item.value) === index);
}
function valuesFor(product: Product | null, optionId?: string) {
  const group = optionGroups(product).find((item) => item.id === optionId);
  return (group?.values || []).map((value: any) => ({ value: value.id || value.value || slugify(value.label || ''), label: value.label || value.id || value.value }));
}
function defaultRule(product: Product | null): Rule {
  const first = optionGroups(product)[0];
  const firstValue = first?.values?.[0] as any;
  return {
    id: `rule-${Date.now()}`,
    name: 'New product option rule',
    enabled: true,
    match: 'all',
    when: [{ option: first?.id || 'finish', operator: 'equals', value: firstValue?.id || firstValue?.value || '' }],
    actions: [{ type: 'message', severity: 'info', text: 'Add your customer-facing message here.' }],
  };
}
function exampleRules(product: Product | null): Rule[] {
  const groups = optionGroups(product);
  const has = (id: string) => groups.some((group) => group.id === id);
  return [
    {
      id: 'rule-foil-needs-soft-touch',
      name: 'Foil requires soft touch lamination',
      enabled: true,
      match: 'all',
      when: [{ option: has('finish') ? 'finish' : 'foiling', operator: 'equals', value: 'foil' }],
      actions: [
        { type: 'forceValue', option: has('lamination') ? 'lamination' : 'finish', value: 'soft-touch', message: 'Foil products require soft touch lamination for best results.' },
        { type: 'message', severity: 'recommended', text: 'Soft touch lamination has been selected automatically because foil was chosen.' },
      ],
    },
    {
      id: 'rule-window-sticker-inside-facing-out',
      name: 'Window sticker inside-facing-out guidance',
      enabled: true,
      match: 'all',
      when: [{ option: has('application') ? 'application' : 'material', operator: 'equals', value: 'inside-facing-out' }],
      actions: [{ type: 'message', severity: 'warning', text: 'Inside-facing-out window stickers need reverse print / adhesive-side setup. Please check artwork orientation.' }],
    },
    {
      id: 'rule-large-banner-panel-join',
      name: 'Large banner panel join warning',
      enabled: true,
      match: 'all',
      when: [{ option: 'widthMm', operator: 'greaterThan', value: '1200' }],
      actions: [{ type: 'suggestPanels', widthField: 'widthMm', heightField: 'heightMm', maxRollWidthMm: 1200, joinCostMinor: 1500, severity: 'warning', message: 'This size may need joined panels because it is wider than the roll. Join seams may be visible.' }],
    },
  ];
}
function normaliseRules(product: Product | null) {
  const rules = Array.isArray(product?.metadataJson?.rules) ? product!.metadataJson!.rules : [];
  return rules.map((rule: any, index: number) => ({ id: rule.id || `rule-${index + 1}`, name: rule.name || `Rule ${index + 1}`, enabled: rule.enabled !== false, match: rule.match || 'all', when: Array.isArray(rule.when) ? rule.when : [], actions: Array.isArray(rule.actions) ? rule.actions : [] }));
}

export default function ProductBuilderRulesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [rules, setRules] = useState<Rule[]>([]);
  const [selectedRuleIndex, setSelectedRuleIndex] = useState(0);
  const [testSelection, setTestSelection] = useState('{\n  "selections": {},\n  "customFields": {\n    "widthMm": 1500,\n    "heightMm": 5000\n  }\n}');
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedProduct = useMemo(() => products.find((product) => product.id === selectedId) || products[0] || null, [products, selectedId]);
  const selectedRule = rules[selectedRuleIndex] || null;
  const fields = useMemo(() => fieldChoices(selectedProduct), [selectedProduct]);
  const groups = useMemo(() => optionGroups(selectedProduct), [selectedProduct]);

  async function load() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/internal/catalog/products?limit=300', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) throw new Error(json.error || 'Products failed to load.');
      const items = Array.isArray(json.data?.items) ? json.data.items : [];
      setProducts(items);
      const next = selectedId ? items.find((item: Product) => item.id === selectedId) : items[0];
      if (next) selectProduct(next.id, items);
    } catch (err) { setError(err instanceof Error ? err.message : 'Rules builder failed to load.'); }
    finally { setLoading(false); }
  }
  function selectProduct(id: string, source = products) {
    const product = source.find((item) => item.id === id) || null;
    setSelectedId(id);
    const next = normaliseRules(product);
    setRules(next);
    setSelectedRuleIndex(0);
    setTestResult(null);
    const defaultSelections: Record<string, any> = {};
    optionGroups(product).forEach((group) => { const first = group.values?.[0] as any; if (first) defaultSelections[group.id] = first.id || first.value || slugify(first.label || ''); });
    setTestSelection(pretty({ selections: defaultSelections, customFields: { widthMm: 1500, heightMm: 5000 } }));
  }
  useEffect(() => { load(); }, []);

  function updateRule(index: number, patch: Rule) { setRules((prev) => prev.map((rule, i) => i === index ? { ...rule, ...patch } : rule)); }
  function updateCondition(conditionIndex: number, patch: Rule) { const when = Array.isArray(selectedRule?.when) ? [...selectedRule.when] : []; when[conditionIndex] = { ...(when[conditionIndex] || {}), ...patch }; updateRule(selectedRuleIndex, { when }); }
  function updateAction(actionIndex: number, patch: Rule) { const actions = Array.isArray(selectedRule?.actions) ? [...selectedRule.actions] : []; actions[actionIndex] = { ...(actions[actionIndex] || {}), ...patch }; updateRule(selectedRuleIndex, { actions }); }
  function addCondition() { updateRule(selectedRuleIndex, { when: [...(selectedRule?.when || []), { option: fields[0]?.value || 'quantity', operator: 'equals', value: '' }] }); }
  function addAction() { updateRule(selectedRuleIndex, { actions: [...(selectedRule?.actions || []), { type: 'message', severity: 'info', text: '' }] }); }
  function removeCondition(index: number) { updateRule(selectedRuleIndex, { when: (selectedRule?.when || []).filter((_: any, i: number) => i !== index) }); }
  function removeAction(index: number) { updateRule(selectedRuleIndex, { actions: (selectedRule?.actions || []).filter((_: any, i: number) => i !== index) }); }
  function applyExamples() { setRules((prev) => [...prev, ...exampleRules(selectedProduct)]); setSelectedRuleIndex(rules.length); }

  async function saveRules() {
    if (!selectedProduct) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const cleanRules = rules.map((rule, index) => ({ ...rule, id: rule.id || slugify(rule.name || `rule-${index + 1}`), enabled: rule.enabled !== false, when: Array.isArray(rule.when) ? rule.when : [], actions: Array.isArray(rule.actions) ? rule.actions : [] }));
      const metadataJson = { ...(selectedProduct.metadataJson || {}), rules: cleanRules, rulesVersion: 'v362-unified', rulesSource: 'product-builder-rules', builderVersion: 'v362' };
      const res = await fetch('/api/internal/catalog/products', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedProduct.id, name: selectedProduct.name, slug: selectedProduct.slug, categoryId: selectedProduct.categoryId ?? null, priceFromMinor: selectedProduct.priceFromMinor ?? 0, currency: selectedProduct.currency || 'GBP', isActive: selectedProduct.isActive ?? false, productType: selectedProduct.productType, metadataJson }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) throw new Error(json.error || 'Rules save failed.');
      setMessage('Rules saved to product metadata and connected to optionGroups.');
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Rules save failed.'); }
    finally { setSaving(false); }
  }
  async function testRules() {
    if (!selectedProduct) return;
    setError(''); setTestResult(null);
    try {
      await saveRules();
      const body = { productId: selectedProduct.id, ...JSON.parse(testSelection) };
      const res = await fetch('/api/internal/catalog/evaluate-rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) throw new Error(json.error?.message || 'Rule test failed.');
      setTestResult(json.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Rule test failed.'); }
  }

  return <div className="space-y-6">
    <PageHeader title="Unified Rules Engine" subtitle="Connect real product optionGroups to conditional logic: force values, hide/disable options, block checkout, show guidance, add price and suggest banner panels." />
    <Card className="p-5"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">v362 unified rules</p><h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Rules now target real selector fields</h2><p className="mt-1 text-sm text-textMuted">Uses product optionGroups from v361 and the backend evaluator used by hosted storefronts.</p></div><div className="flex flex-wrap gap-2"><button onClick={() => setRules((prev) => [...prev, defaultRule(selectedProduct)])} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white"><Plus size={16}/>New rule</button><button onClick={applyExamples} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white">Add print examples</button><button onClick={saveRules} disabled={!selectedProduct || saving} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"><Save size={16}/>Save rules</button></div></div></Card>
    {error ? <div className="flex items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100"><AlertTriangle size={18}/>{error}</div> : null}
    {message ? <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100"><CheckCircle2 size={18}/>{message}</div> : null}
    <div className="grid gap-4 xl:grid-cols-[300px_1fr_420px]">
      <Card><h3 className="text-sm font-semibold text-white">Products</h3><div className="mt-4 space-y-2">{products.map((product) => <button key={product.id} onClick={() => selectProduct(product.id)} className={`w-full rounded-2xl border p-3 text-left transition ${selectedProduct?.id === product.id ? 'border-sky-400/40 bg-sky-400/10' : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06]'}`}><p className="text-sm font-semibold text-white">{product.name}</p><p className="mt-1 text-xs text-textMuted">/{product.slug}</p><p className="mt-2 text-xs text-textMuted">{optionGroups(product).length} option group(s) · {normaliseRules(product).length} rule(s)</p></button>)}{!products.length && !loading ? <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-textMuted">No products found.</p> : null}</div></Card>
      <Card><div className="grid gap-4 lg:grid-cols-[260px_1fr]"><div className="space-y-2">{rules.map((rule, index) => <button key={`${rule.id}-${index}`} onClick={() => setSelectedRuleIndex(index)} className={`w-full rounded-2xl border p-3 text-left ${selectedRuleIndex === index ? 'border-sky-400/40 bg-sky-400/10' : 'border-white/8 bg-white/[0.03]'}`}><div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold text-white">{rule.name || rule.id}</p><Trash2 size={14} className="text-rose-200" onClick={(e) => { e.stopPropagation(); setRules((prev) => prev.filter((_, i) => i !== index)); setSelectedRuleIndex(0); }}/></div><p className="mt-1 text-xs text-textMuted">IF {rule.when?.length || 0} · THEN {rule.actions?.length || 0}</p></button>)}{!rules.length ? <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-textMuted">Click New rule or Add print examples.</div> : null}</div>
        {selectedRule ? <div className="space-y-5"><div className="grid gap-4 md:grid-cols-3"><label className="space-y-2 md:col-span-2"><span className="text-sm font-medium">Rule name</span><Input value={selectedRule.name || ''} onChange={(e) => updateRule(selectedRuleIndex, { name: e.target.value, id: selectedRule.id || slugify(e.target.value) })}/></label><label className="space-y-2"><span className="text-sm font-medium">Match</span><Select options={[{ value: 'all', label: 'All IF rows' }, { value: 'any', label: 'Any IF row' }]} value={selectedRule.match || 'all'} onChange={(e) => updateRule(selectedRuleIndex, { match: e.target.value })}/></label></div>
          <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-white">IF conditions</h3><button onClick={addCondition} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-white">Add IF</button></div><div className="mt-4 space-y-3">{(selectedRule.when || []).map((condition: any, index: number) => { const valueChoices = valuesFor(selectedProduct, condition.option || condition.field); return <div key={index} className="grid gap-2 rounded-2xl border border-white/8 bg-black/20 p-3 md:grid-cols-[1fr_1fr_1fr_auto]"><Select options={fields} value={condition.option || condition.field || ''} onChange={(e) => updateCondition(index, { option: e.target.value, field: undefined, value: '' })}/><Select options={operators} value={condition.operator || 'equals'} onChange={(e) => updateCondition(index, { operator: e.target.value })}/>{valueChoices.length && !['greaterThan','greaterThanOrEqual','lessThan','lessThanOrEqual'].includes(condition.operator) ? <Select options={[{ value: '', label: 'Choose value' }, ...valueChoices]} value={condition.value ?? ''} onChange={(e) => updateCondition(index, { value: e.target.value })}/> : <Input value={condition.value ?? ''} onChange={(e) => updateCondition(index, { value: e.target.value })}/>}<button onClick={() => removeCondition(index)} className="rounded-xl border border-rose-400/20 px-3 text-rose-100"><Trash2 size={14}/></button></div>; })}</div></section>
          <section className="rounded-3xl border border-white/8 bg-white/[0.03] p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-white">THEN actions</h3><button onClick={addAction} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-white">Add THEN</button></div><div className="mt-4 space-y-3">{(selectedRule.actions || []).map((action: any, index: number) => { const actionValueChoices = valuesFor(selectedProduct, action.option); return <div key={index} className="rounded-2xl border border-white/8 bg-black/20 p-3"><div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]"><Select options={actionTypes} value={action.type || 'message'} onChange={(e) => updateAction(index, { type: e.target.value })}/>{['forceValue','disableValue','hideOption'].includes(action.type) ? <Select options={fields} value={action.option || ''} onChange={(e) => updateAction(index, { option: e.target.value, field: undefined })}/> : <Input placeholder="Field / option" value={action.field || action.option || ''} onChange={(e) => updateAction(index, { field: e.target.value })}/>} {['forceValue','disableValue'].includes(action.type) && actionValueChoices.length ? <Select options={[{ value: '', label: 'Choose value' }, ...actionValueChoices]} value={action.value || ''} onChange={(e) => updateAction(index, { value: e.target.value })}/> : ['forceValue','disableValue'].includes(action.type) ? <Input placeholder="Value" value={action.value || ''} onChange={(e) => updateAction(index, { value: e.target.value })}/> : action.type === 'addPrice' ? <Input placeholder="Amount minor" value={action.amountMinor || ''} onChange={(e) => updateAction(index, { amountMinor: Number(e.target.value) })}/> : action.type === 'suggestPanels' ? <Input placeholder="Max roll width mm" value={action.maxRollWidthMm || 1200} onChange={(e) => updateAction(index, { maxRollWidthMm: Number(e.target.value), widthField: 'widthMm', heightField: 'heightMm' })}/> : <Select options={severities} value={action.severity || 'info'} onChange={(e) => updateAction(index, { severity: e.target.value })}/>} <button onClick={() => removeAction(index)} className="rounded-xl border border-rose-400/20 px-3 text-rose-100"><Trash2 size={14}/></button></div><Input placeholder="Customer/admin message" value={action.text || action.message || ''} onChange={(e) => updateAction(index, { text: e.target.value, message: e.target.value })} className="mt-2" /></div>; })}</div></section></div> : <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-textMuted">Select or create a rule.</p>}
      </div></Card>
      <div className="space-y-4"><Card><h3 className="font-semibold text-white">OptionGroups connected</h3><div className="mt-4 space-y-2">{groups.map((group) => <div key={group.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"><p className="text-sm font-semibold text-white">{group.label || group.id}</p><p className="mt-1 text-xs text-textMuted">{group.selector || 'dropdown'} · {(group.values || []).length} values</p></div>)}</div></Card><Card><h3 className="font-semibold text-white">Test rules</h3><textarea value={testSelection} onChange={(e) => setTestSelection(e.target.value)} className="mt-4 min-h-[220px] w-full rounded-2xl border border-white/10 bg-black/30 p-4 font-mono text-xs text-white outline-none" /><button onClick={testRules} disabled={!selectedProduct || saving} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"><Wand2 size={16}/>Save & test</button></Card><Card><p className="text-[11px] uppercase tracking-[0.24em] text-textMuted">Evaluation result</p><pre className="mt-4 max-h-[360px] overflow-auto rounded-2xl border border-white/8 bg-black/30 p-4 text-[11px] leading-5 text-textMuted">{testResult ? pretty(testResult) : 'No test run yet.'}</pre></Card></div>
    </div>
  </div>;
}
