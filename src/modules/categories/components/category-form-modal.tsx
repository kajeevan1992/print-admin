import { useMemo } from 'react';
import { BaseModal } from '@/components/modals/base-modal';
import { FormGrid } from '@/components/forms/form-grid';
import { FormSection } from '@/components/forms/form-section';
import { Input } from '@/components/forms/input';
import { Select, type SelectOption } from '@/components/forms/select';
import { Toggle } from '@/components/forms/toggle';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { CategoryFormValues, CategoryTag } from '@/modules/categories/types';

export function CategoryFormModal({
  open,
  title,
  values,
  categoryOptions,
  pricingOptions,
  attributeOptions,
  accuZipOptions,
  availableTags,
  onChange,
  onAddTag,
  onRemoveTag,
  onClose,
  onSubmit
}: {
  open: boolean;
  title: string;
  values: CategoryFormValues;
  categoryOptions: SelectOption[];
  pricingOptions: SelectOption[];
  attributeOptions: SelectOption[];
  accuZipOptions: SelectOption[];
  availableTags: CategoryTag[];
  onChange: (changes: Partial<CategoryFormValues>) => void;
  onAddTag: () => void;
  onRemoveTag: (tagId: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const unassignedTagOptions = useMemo(
    () => availableTags.filter((tag) => !values.tagIds.includes(tag.id)).map((tag) => ({ value: tag.id, label: tag.label })),
    [availableTags, values.tagIds]
  );

  return (
    <BaseModal open={open} onClose={onClose} title={title}>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <FormSection title="Category Settings">
            <FormGrid>
              <Input placeholder="Name" value={values.name} onChange={(e) => onChange({ name: e.target.value })} />
              <Input placeholder="Friendly URL" value={values.friendlyUrl} onChange={(e) => onChange({ friendlyUrl: e.target.value })} />
              <Select options={categoryOptions} value={values.parentId} onChange={(e) => onChange({ parentId: e.target.value })} />
              <Select options={pricingOptions} value={values.pricingId} onChange={(e) => onChange({ pricingId: e.target.value })} />
              <Select options={attributeOptions} value={values.attributeSetId} onChange={(e) => onChange({ attributeSetId: e.target.value })} />
              <Select options={accuZipOptions} value={values.accuZipConfig} onChange={(e) => onChange({ accuZipConfig: e.target.value })} />
            </FormGrid>
            <textarea
              value={values.description}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={4}
              placeholder="Internal description"
              className="mt-3 w-full rounded-lg border border-border bg-panelMuted p-3 text-sm outline-none focus:border-accent"
            />
            <Input className="mt-3" placeholder="Thumbnail URL" value={values.thumbnail} onChange={(e) => onChange({ thumbnail: e.target.value })} />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ToggleRow label="Published" checked={values.published} onChange={(published) => onChange({ published })} />
              <ToggleRow label="Use Alternate Master" checked={values.useAlternateMaster} onChange={(useAlternateMaster) => onChange({ useAlternateMaster })} />
              <ToggleRow label="Can Browse" checked={values.canBrowse} onChange={(canBrowse) => onChange({ canBrowse })} />
              <ToggleRow label="Can Upload" checked={values.canUpload} onChange={(canUpload) => onChange({ canUpload })} />
              <ToggleRow label="Can Upload Later" checked={values.canUploadLater} onChange={(canUploadLater) => onChange({ canUploadLater })} />
              <ToggleRow label="Can Create" checked={values.canCreate} onChange={(canCreate) => onChange({ canCreate })} />
              <ToggleRow label="Can Customize" checked={values.canCustom} onChange={(canCustom) => onChange({ canCustom })} />
            </div>
          </FormSection>
        </div>

        <div className="space-y-4">
          <FormSection title="Category Tags">
            <div className="flex gap-2">
              <Select
                options={unassignedTagOptions.length ? unassignedTagOptions : [{ value: '', label: 'No more tags available' }]}
                value={values.selectedTagId}
                onChange={(e) => onChange({ selectedTagId: e.target.value })}
                disabled={!unassignedTagOptions.length}
              />
              <Button onClick={onAddTag} disabled={!values.selectedTagId || !unassignedTagOptions.length}>Add</Button>
            </div>
            <div className="mt-3 space-y-2">
              {values.tagIds.length === 0 ? <p className="text-sm text-textMuted">No tags assigned.</p> : availableTags.filter((tag) => values.tagIds.includes(tag.id)).map((tag) => (
                <div key={tag.id} className="flex items-center justify-between rounded-lg border border-border bg-panelMuted px-3 py-2 text-sm">
                  <span>{tag.label}</span>
                  <button onClick={() => onRemoveTag(tag.id)} className="text-red-300">Remove</button>
                </div>
              ))}
            </div>
          </FormSection>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <PrimaryButton onClick={onSubmit}>Save Category</PrimaryButton>
      </div>
    </BaseModal>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
      <span>{label}</span>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}
