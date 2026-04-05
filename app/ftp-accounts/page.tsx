import { SimpleListPage } from '@/components/configuration/simple-list-page';

export default function Page() {
  return (
    <SimpleListPage
      title="FTP Accounts"
      subtitle="Manage external file drop accounts used for batch assets and production handoff."
      actionLabel="Add FTP Account"
      items={[
        { title: 'Vendor Artwork Drop', subtitle: 'Daily uploads from agency', meta: 'SFTP enforced' },
        { title: 'Legacy Asset Sync', subtitle: 'Archive import only', meta: 'Readonly account' },
        { title: 'Plant Job Intake', subtitle: 'Production automation link', meta: 'Folder watch enabled' }
      ]}
    />
  );
}
