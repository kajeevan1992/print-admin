'use client';

import { useMemo, useState, type DragEvent } from 'react';
import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, GripVertical, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { StorefrontMediaField } from '@/modules/themes/components/storefront-media-library';
import type { ThemeEditorField, ThemeSectionField, ThemeSectionType } from '@/modules/themes/types';

type SectionRecord = Record<string, unknown> & { id: string; type: string; enabled: boolean };
type RepeaterItem = Record<string, unknown>;

const legacyFields: ThemeSectionField[] = [
  { key: 'eyebrow', label: 'Eyebrow', type: 'text' },
  { key: 'title', label: 'Heading', type: 'text' },
  { key: 'body', label: 'Body text', type: 'textarea' },
  { key: 'imageUrl', label: 'Image', type: 'image' },
  { key: 'buttonLabel', label: 'Button label', type: 'text' },
  { key: 'buttonHref', label: 'Button link', type: 'text' },
];

function text(value: unknown) {
  return String(value ?? '').trim();
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value ?? null)) as T;
}

function uid(prefix: string) {
  const random = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

function parseSections(value: unknown): SectionRecord[] {
  let source: unknown = value;
  if (typeof value === 'string') {
    try { source = JSON.parse(value); } catch { return []; }
  }
  if (!Array.isArray(source)) return [];
  return source
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item, index) => {
      const row = object(item);
      const type = text(row.type) || 'rich-text';
      return {
        ...row,
        id: text(row.id) || `${type}-${index + 1}`,
        type,
        enabled: row.enabled !== false,
      } as SectionRecord;
    });
}

function rawSections(value: unknown) {
  if (typeof value === 'string') return value;
  try { return JSON.stringify(Array.isArray(value) ? value : [], null, 2); } catch { return '[]'; }
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.map(text).filter(Boolean).join('\n') : text(value);
}

function stringListValue(value: string) {
  return value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
}

function defaultValue(field: ThemeSectionField): unknown {
  if (field.type === 'boolean') return false;
  if (field.type === 'number') return field.min ?? 0;
  if (field.type === 'repeater' || field.type === 'string-list') return [];
  if (field.type === 'select') return field.options?.[0]?.value || '';
  return '';
}

function fieldSpan(field: ThemeSectionField) {
  return field.type === 'textarea' || field.type === 'repeater' || field.type === 'string-list' || field.type === 'image' ? 'lg:col-span-2' : '';
}

function RepeaterEditor({ field, value, onChange }: { field: ThemeSectionField; value: unknown; onChange: (value: unknown) => void }) {
  const rows = Array.isArray(value) ? value.map(object) : [];
  const itemFields = field.itemFields || [];
  const maximum = field.max || 20;

  const replace = (next: RepeaterItem[]) => onChange(next);
  const update = (index: number, key: string, nextValue: unknown) => replace(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: nextValue } : row));
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    replace(next);
  };
  const add = () => {
    if (rows.length >= maximum) return;
    const next = itemFields.reduce<RepeaterItem>((output, itemField) => ({ ...output, [itemField.key]: defaultValue(itemField) }), {});
    replace([...rows, next]);
  };

  return (
    <div className="space-y-3 rounded-xl border border-white/8 bg-black/10 p-3">
      {rows.map((row, index) => (
        <div key={index} className="rounded-xl border border-white/8 bg-panelMuted/80 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">{field.itemLabel || 'Item'} {index + 1}</div>
            <div className="flex items-center gap-1">
              <button type="button" title="Move up" disabled={index === 0} onClick={() => move(index, -1)} className="rounded-lg border border-white/8 p-1.5 text-textMuted transition hover:text-white disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
              <button type="button" title="Move down" disabled={index === rows.length - 1} onClick={() => move(index, 1)} className="rounded-lg border border-white/8 p-1.5 text-textMuted transition hover:text-white disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
              <button type="button" title="Remove item" onClick={() => replace(rows.filter((_, rowIndex) => rowIndex !== index))} className="rounded-lg border border-red-500/20 p-1.5 text-red-300 transition hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {itemFields.map((itemField) => (
              <div key={itemField.key} className={fieldSpan(itemField)}>
                <label className="mb-1.5 block text-[11px] font-medium text-text">{itemField.label}</label>
                <SectionFieldControl field={itemField} value={row[itemField.key]} onChange={(nextValue) => update(index, itemField.key, nextValue)} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <button type="button" disabled={rows.length >= maximum} onClick={add} className="inline-flex items-center gap-2 rounded-xl border border-dashed border-accent/40 bg-accent/5 px-3 py-2 text-[11px] font-semibold text-accent transition hover:bg-accent/10 disabled:opacity-40"><Plus className="h-3.5 w-3.5" />Add {field.itemLabel?.toLowerCase() || 'item'}</button>
    </div>
  );
}

function SectionFieldControl({ field, value, onChange }: { field: ThemeSectionField; value: unknown; onChange: (value: unknown) => void }) {
  if (field.type === 'image') {
    return <StorefrontMediaField value={value} onChange={onChange} placeholder={field.placeholder || 'Upload, choose or paste an image URL'} />;
  }

  if (field.type === 'boolean') {
    return (
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 text-[13px] text-text">
        <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-accent" />
        <span>{Boolean(value) ? 'Enabled' : 'Disabled'}</span>
      </label>
    );
  }

  if (field.type === 'select') {
    return <Select value={text(value)} options={(field.options || []).map((option) => ({ label: option.label, value: option.value }))} onChange={(event) => onChange(event.target.value)} />;
  }

  if (field.type === 'textarea') {
    return <textarea value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} rows={4} placeholder={field.placeholder || ''} className="w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 text-[13px] leading-6 text-text outline-none transition placeholder:text-textMuted/70 focus:border-accent/70 focus:bg-panelMuted" />;
  }

  if (field.type === 'string-list') {
    return <textarea value={stringList(value)} onChange={(event) => onChange(stringListValue(event.target.value))} rows={4} placeholder={field.placeholder || 'One value per line'} spellCheck={false} className="w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 font-mono text-[12px] leading-6 text-text outline-none transition placeholder:text-textMuted/70 focus:border-accent/70 focus:bg-panelMuted" />;
  }

  if (field.type === 'repeater') {
    return <RepeaterEditor field={field} value={value} onChange={onChange} />;
  }

  if (field.type === 'number') {
    const numeric = Number(value);
    return <input type="number" value={Number.isFinite(numeric) ? numeric : ''} min={field.min} max={field.max} onChange={(event) => onChange(event.target.value === '' ? '' : event.target.valueAsNumber)} className="h-11 w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 text-[13px] text-text outline-none transition focus:border-accent/70 focus:bg-panelMuted" />;
  }

  return <Input type="text" value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} placeholder={field.placeholder || ''} />;
}

function SectionCard({ section, definition, index, total, open, dragging, onToggleOpen, onUpdate, onMove, onDuplicate, onRemove, onDragStart, onDrop }: {
  section: SectionRecord;
  definition: ThemeSectionType | null;
  index: number;
  total: number;
  open: boolean;
  dragging: boolean;
  onToggleOpen: () => void;
  onUpdate: (next: SectionRecord) => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
}) {
  const fields = definition?.fields || legacyFields;
  const label = definition?.label || `Custom: ${section.type}`;
  const summary = text(section.title) || definition?.description || 'Untitled section';

  return (
    <article onDragOver={(event) => event.preventDefault()} onDrop={onDrop} className={`rounded-2xl border bg-panel transition ${dragging ? 'border-accent/70 opacity-60' : 'border-white/8'}`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-white/8 px-3 py-3 sm:flex-nowrap">
        <span draggable onDragStart={onDragStart} title="Drag to reorder" className="cursor-grab rounded-lg p-1.5 text-textMuted hover:bg-white/5 hover:text-white active:cursor-grabbing"><GripVertical className="h-4 w-4" /></span>
        <button type="button" onClick={onToggleOpen} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent/12 px-2.5 py-1 text-[10px] font-semibold text-accent">{label}</span>
            {!section.enabled ? <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-textMuted">Hidden</span> : null}
          </div>
          <div className="mt-1 truncate text-[12px] font-medium text-text">{summary}</div>
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" title={section.enabled ? 'Hide section' : 'Show section'} onClick={() => onUpdate({ ...section, enabled: !section.enabled })} className="rounded-lg border border-white/8 p-2 text-textMuted transition hover:text-white">{section.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
          <button type="button" title="Move up" disabled={index === 0} onClick={() => onMove(-1)} className="rounded-lg border border-white/8 p-2 text-textMuted transition hover:text-white disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
          <button type="button" title="Move down" disabled={index === total - 1} onClick={() => onMove(1)} className="rounded-lg border border-white/8 p-2 text-textMuted transition hover:text-white disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
          <button type="button" title="Duplicate section" onClick={onDuplicate} className="rounded-lg border border-white/8 p-2 text-textMuted transition hover:text-white"><Copy className="h-3.5 w-3.5" /></button>
          <button type="button" title="Delete section" onClick={onRemove} className="rounded-lg border border-red-500/20 p-2 text-red-300 transition hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
          <button type="button" title={open ? 'Collapse section' : 'Edit section'} onClick={onToggleOpen} className="rounded-lg border border-white/8 p-2 text-textMuted transition hover:text-white">{open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</button>
        </div>
      </div>

      {open ? <div className="p-4">
        {!definition ? <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-[11px] leading-5 text-amber-100">This section type came from older or custom theme data. Common fields remain editable and unrecognised values are preserved.</div> : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {fields.map((field) => (
            <div key={field.key} className={fieldSpan(field)}>
              <label className="mb-2 block text-[12px] font-medium text-text">{field.label}</label>
              {field.description ? <p className="mb-2 text-[11px] leading-5 text-textMuted">{field.description}</p> : null}
              <SectionFieldControl field={field} value={section[field.key]} onChange={(nextValue) => onUpdate({ ...section, [field.key]: nextValue })} />
            </div>
          ))}
        </div>
      </div> : null}
    </article>
  );
}

export function StorefrontSectionBuilder({ field, value, onChange }: { field: ThemeEditorField; value: unknown; onChange: (value: unknown) => void }) {
  const definitions = field.sectionTypes || [];
  const sections = useMemo(() => parseSections(value), [value]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [draggingId, setDraggingId] = useState('');
  const maximum = field.maxItems || 30;

  if (!definitions.length) {
    return <textarea value={rawSections(value)} onChange={(event) => onChange(event.target.value)} rows={12} spellCheck={false} className="w-full rounded-xl border border-white/8 bg-panelMuted/90 px-3.5 py-3 font-mono text-[12px] leading-6 text-text outline-none transition placeholder:text-textMuted/70 focus:border-accent/70 focus:bg-panelMuted" />;
  }

  const replace = (next: SectionRecord[]) => onChange(next);
  const update = (id: string, next: SectionRecord) => replace(sections.map((section) => section.id === id ? next : section));
  const move = (id: string, direction: -1 | 1) => {
    const index = sections.findIndex((section) => section.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    replace(next);
  };
  const add = (definition: ThemeSectionType) => {
    if (sections.length >= maximum) return;
    const next = { ...clone(definition.defaults || {}), id: uid(definition.type), type: definition.type, enabled: true } as SectionRecord;
    replace([...sections, next]);
    setOpenSections((current) => ({ ...current, [next.id]: true }));
  };
  const duplicate = (section: SectionRecord) => {
    if (sections.length >= maximum) return;
    const index = sections.findIndex((item) => item.id === section.id);
    const copy = { ...clone(section), id: uid(section.type) } as SectionRecord;
    const next = [...sections];
    next.splice(index + 1, 0, copy);
    replace(next);
    setOpenSections((current) => ({ ...current, [copy.id]: true }));
  };
  const remove = (section: SectionRecord) => {
    if (typeof window !== 'undefined' && !window.confirm(`Delete ${text(section.title) || section.type}?`)) return;
    replace(sections.filter((item) => item.id !== section.id));
  };
  const drop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return setDraggingId('');
    const from = sections.findIndex((section) => section.id === draggingId);
    const to = sections.findIndex((section) => section.id === targetId);
    if (from < 0 || to < 0) return setDraggingId('');
    const next = [...sections];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    replace(next);
    setDraggingId('');
  };

  return (
    <div className="space-y-4 rounded-2xl border border-white/8 bg-black/10 p-4">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[13px] font-semibold text-white">Page sections</div>
            <p className="mt-1 text-[11px] leading-5 text-textMuted">Drag sections or use the arrows to reorder them. Hidden sections stay in the draft but are not rendered.</p>
          </div>
          <span className="rounded-full border border-white/8 bg-panelMuted px-3 py-1.5 text-[10px] font-semibold text-textMuted">{sections.length}/{maximum} sections</span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {definitions.map((definition) => (
          <button key={definition.type} type="button" disabled={sections.length >= maximum} onClick={() => add(definition)} className="rounded-xl border border-dashed border-white/12 bg-panelMuted/60 p-3 text-left transition hover:border-accent/50 hover:bg-accent/5 disabled:opacity-40">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-text"><Plus className="h-3.5 w-3.5 text-accent" />{definition.label}</div>
            {definition.description ? <p className="mt-1.5 text-[10px] leading-4 text-textMuted">{definition.description}</p> : null}
          </button>
        ))}
      </div>

      {sections.length ? <div className="space-y-3">
        {sections.map((section, index) => {
          const definition = definitions.find((item) => item.type === section.type) || null;
          return <SectionCard
            key={section.id}
            section={section}
            definition={definition}
            index={index}
            total={sections.length}
            open={Boolean(openSections[section.id])}
            dragging={draggingId === section.id}
            onToggleOpen={() => setOpenSections((current) => ({ ...current, [section.id]: !current[section.id] }))}
            onUpdate={(next) => update(section.id, next)}
            onMove={(direction) => move(section.id, direction)}
            onDuplicate={() => duplicate(section)}
            onRemove={() => remove(section)}
            onDragStart={(event) => { setDraggingId(section.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', section.id); }}
            onDrop={(event) => { event.preventDefault(); drop(section.id); }}
          />;
        })}
      </div> : <div className="rounded-xl border border-dashed border-white/12 bg-panelMuted/40 p-6 text-center text-[12px] text-textMuted">No homepage sections yet. Add a hero, product grid, cards, text, banner or another block above.</div>}
    </div>
  );
}
