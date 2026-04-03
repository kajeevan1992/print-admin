import { BaseModal } from '@/components/modals/base-modal';
import { FormGrid } from '@/components/forms/form-grid';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Toggle } from '@/components/forms/toggle';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { ChannelForm } from '@/modules/channels/types';

export function ChannelFormModal({ open, value, themeOptions, onChange, onClose, onSubmit }: {
  open: boolean;
  value: ChannelForm;
  themeOptions: string[];
  onChange: (changes: Partial<ChannelForm>) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <BaseModal open={open} onClose={onClose} title="Create Channel">
      <div className="space-y-3">
        <FormGrid>
          <Input placeholder="Name" value={value.name} onChange={(e) => onChange({ name: e.target.value })} />
          <Input placeholder="Slug" value={value.slug} onChange={(e) => onChange({ slug: e.target.value })} />
          <Input placeholder="Domain" value={value.domain} onChange={(e) => onChange({ domain: e.target.value })} />
          <Select options={['USD', 'EUR']} value={value.currency} onChange={(e) => onChange({ currency: e.target.value })} />
          <Select options={['en-US', 'en-GB', 'de-DE']} value={value.locale} onChange={(e) => onChange({ locale: e.target.value })} />
          <Select options={themeOptions} value={value.themeId} onChange={(e) => onChange({ themeId: e.target.value })} />
        </FormGrid>
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          Headless (API only)
          <Toggle checked={value.isHeadless} onChange={(checked) => onChange({ isHeadless: checked })} />
        </div>
        <div className="flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><PrimaryButton onClick={onSubmit}>Create Channel</PrimaryButton></div>
      </div>
    </BaseModal>
  );
}
