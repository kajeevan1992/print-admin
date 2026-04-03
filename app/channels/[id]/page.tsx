import { ChannelDetailPage } from '@/modules/channels/pages/channel-detail-page';

export default function Page({ params }: { params: { id: string } }) {
  return <ChannelDetailPage id={params.id} />;
}
