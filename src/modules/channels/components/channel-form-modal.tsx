import { BaseModal } from '@/components/modals/base-modal';
import { FormGrid } from '@/components/forms/form-grid';
import { Input } from '@/components/forms/input';
import { Select } from '@/components/forms/select';
import { Toggle } from '@/components/forms/toggle';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import type { ChannelForm } from '@/modules/channels/types';

export function ChannelFormModal({ open, value, themeOptions, mode = 'create', onChange, onClose, onSubmit }: { open: boolean; value: ChannelForm; themeOptions: string[]; mode?: 'create' | 'edit'; onChange: (changes: Partial<ChannelForm>) => void; onClose: () => void; onSubmit: () => void }) {
  const title = mode === 'edit' ? 'Edit Store Channel' : 'Create Store Channel';
  return <BaseModal open={open} onClose={onClose} title={title}><div className="space-y-3"><FormGrid><Input placeholder="Store/channel name" value={value.name} onChange={(e) => onChange({ name: e.target.value })} /><Input placeholder="Store slug, e.g. default-store" value={value.slug} onChange={(e) => onChange({ slug: e.target.value })} /><Input placeholder="Domain or subdomain, e.g. print.example.co.uk" value={value.domain} onChange={(e) => onChange({ domain: e.target.value })} /><Select options={['GBP', 'USD', 'EUR']} value={value.currency} onChange={(e) => onChange({ currency: e.target.value })} /><Select options={['en-GB', 'en-US', 'de-DE']} value={value.locale} onChange={(e) => onChange({ locale: e.target.value })} /><Select options={themeOptions.length ? themeOptions : ['base']} value={value.themeId || 'base'} onChange={(e) => onChange({ themeId: e.target.value })} /></FormGrid><div className="rounded-lg border border-border px-3 py-2"><div className="flex items-center justify-between"><span>External/headless API storefront</span><Toggle checked={value.isHeadless} onChange={(checked) => onChange({ isHeadless: checked })} /></div><p className="mt-2 text-xs text-textMuted">Off = hosted theme served by this SaaS. On = customer hosts frontend elsewhere and connects using API keys/webhooks.</p></div><div className="flex justify-end gap-2"><Button onClick={onClose}>Cancel</Button><PrimaryButton onClick={onSubmit}>{mode === 'edit' ? 'Save Channel' : 'Create Channel'}</PrimaryButton></div></div></BaseModal>;
}
