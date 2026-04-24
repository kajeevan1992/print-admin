'use client';

import { BaseModal } from '@/components/modals/base-modal';
import { Input } from '@/components/forms/input';
import { Select, type SelectOption } from '@/components/forms/select';
import { Toggle } from '@/components/forms/toggle';
import { Button, PrimaryButton } from '@/components/ui/buttons';

type Field = {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'select' | 'toggle';
  options?: SelectOption[];
  placeholder?: string;
};

export function PlatformEntityModal({
  open,
  title,
  fields,
  values,
  onChange,
  onClose,
  onSubmit
}: {
  open: boolean;
  title: string;
  fields: Field[];
  values: Record<string, string | boolean>;
  onChange: (key: string, value: string | boolean) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <BaseModal open={open} title={title} onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => {
          const value = values[field.key];
          if (field.type === 'toggle') {
            return (
              <div key={field.key} className="flex items-center justify-between rounded-lg border border-border bg-panelMuted px-3 py-2 md:col-span-2">
                <span className="text-sm">{field.label}</span>
                <Toggle checked={Boolean(value)} onChange={(checked) => onChange(field.key, checked)} />
              </div>
            );
          }
          if (field.type === 'select') {
            return (
              <label key={field.key} className="space-y-2">
                <span className="text-sm font-medium">{field.label}</span>
                <Select options={field.options ?? []} value={String(value ?? '')} onChange={(event) => onChange(field.key, event.target.value)} />
              </label>
            );
          }
          if (field.type === 'textarea') {
            return (
              <label key={field.key} className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium">{field.label}</span>
                <textarea
                  value={String(value ?? '')}
                  placeholder={field.placeholder}
                  onChange={(event) => onChange(field.key, event.target.value)}
                  className="min-h-28 w-full rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
            );
          }
          return (
            <label key={field.key} className="space-y-2">
              <span className="text-sm font-medium">{field.label}</span>
              <Input value={String(value ?? '')} placeholder={field.placeholder} onChange={(event) => onChange(field.key, event.target.value)} />
            </label>
          );
        })}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <PrimaryButton onClick={onSubmit}>Save</PrimaryButton>
      </div>
    </BaseModal>
  );
}
