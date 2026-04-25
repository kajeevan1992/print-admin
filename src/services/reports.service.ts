import { activityLog, channelPerformance, productPerformance, revenueSeries, type ActivityLogItem } from '@/data/reports';

function normaliseSeverity(value: unknown): ActivityLogItem['severity'] {
  return value === 'critical' || value === 'warning' || value === 'info' ? value : 'info';
}

function mapActivityRecord(row: Record<string, unknown>, index: number): ActivityLogItem {
  const meta = (row.metadataJson && typeof row.metadataJson === 'object' ? row.metadataJson : {}) as Record<string, unknown>;
  return {
    id: String(row.id ?? meta.id ?? `activity-${index + 1}`),
    actor: String(row.actor ?? meta.actor ?? row.owner ?? meta.owner ?? 'System'),
    area: String(row.area ?? meta.area ?? 'Platform'),
    action: String(row.action ?? meta.action ?? row.title ?? row.name ?? 'Recorded'),
    target: String(row.target ?? meta.target ?? row.description ?? meta.subtitle ?? 'Platform record'),
    timestamp: String(row.timestamp ?? meta.timestamp ?? row.createdAt ?? meta.createdAt ?? new Date().toISOString()),
    severity: normaliseSeverity(row.severity ?? meta.severity),
  };
}

async function getActivityLogFromInternalApi(): Promise<ActivityLogItem[]> {
  if (typeof fetch === 'undefined') return [];
  const response = await fetch('/api/internal/config/platform-activity-log/items', { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error || 'Activity log API failed.');
  const rows = payload?.data?.items;
  if (!Array.isArray(rows) || rows.length === 0) return [];
  return rows.map((row: Record<string, unknown>, index: number) => mapActivityRecord(row, index));
}

export const reportsService = {
  getRevenueSeries: async () => revenueSeries,
  getChannelPerformance: async () => channelPerformance,
  getProductPerformance: async () => productPerformance,
  getActivityLog: async () => {
    try {
      const live = await getActivityLogFromInternalApi();
      return live.length ? live : activityLog;
    } catch {
      return activityLog;
    }
  }
};
