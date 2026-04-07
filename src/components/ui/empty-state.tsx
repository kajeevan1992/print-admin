import { PremiumEmptyState } from '@/components/ui/premium-empty-state';

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <PremiumEmptyState title={title} description={description} />;
}
