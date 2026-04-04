import { UserDetailPage } from '@/modules/users/pages/user-detail-page';

export default function Page({ params }: { params: { id: string } }) {
  return <UserDetailPage id={params.id} />;
}
