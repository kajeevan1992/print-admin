'use client';

import { LocalRecordsPage } from '@/components/configuration/local-records-page';

export default function Page() {
  return (
    <LocalRecordsPage
      storageKey="advanced-ftp-accounts"
      title="FTP Accounts"
      subtitle="Manage external file drop accounts used for batch assets, artwork intake, and production handoff."
      createLabel="Add FTP Account"
      initialItems={[
        {
          id: 'ftp-1',
          title: 'Vendor Artwork Drop',
          subtitle: 'sftp • active',
          meta: 'Agency uploads • daily watch',
          protocol: 'sftp',
          status: 'active',
          owner: 'Creative Ops',
          endpoint: 'sftp.vendor-artwork.local',
          notes: 'Primary intake for IDML packages and linked image assets.'
        },
        {
          id: 'ftp-2',
          title: 'Legacy Asset Sync',
          subtitle: 'ftp • readonly',
          meta: 'Archive import • migration only',
          protocol: 'ftp',
          status: 'readonly',
          owner: 'Migration Team',
          endpoint: 'legacy-assets.local',
          notes: 'Used only for historical archive pulls.'
        },
        {
          id: 'ftp-3',
          title: 'Plant Job Intake',
          subtitle: 'sftp • active',
          meta: 'Folder watch • production automation',
          protocol: 'sftp',
          status: 'active',
          owner: 'Plant Systems',
          endpoint: 'plant-intake.local',
          notes: 'Feeds print-ready PDF and JDF bundles to manufacturing.'
        }
      ]}
      fields={[
        { key: 'protocol', label: 'Protocol', options: ['sftp', 'ftp', 'ftps'] },
        { key: 'status', label: 'Status', options: ['active', 'paused', 'readonly'] },
        { key: 'owner', label: 'Owner' },
        { key: 'endpoint', label: 'Endpoint' },
        { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Usage notes, security considerations, folder rules.' }
      ]}
      subtitleFields={['protocol', 'status']}
      cardMetaFields={['owner', 'endpoint']}
      searchKeys={['title', 'protocol', 'status', 'owner', 'endpoint', 'notes']}
    />
  );
}
