import { Card } from '@/components/ui/card';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type LegacyLineDatum = { month: string; orders: number; quotes: number };
type SingleSeriesDatum = { label: string; value: number };

type LineChartCardProps = {
  title: string;
  data: LegacyLineDatum[] | SingleSeriesDatum[];
};

const isLegacyDatum = (item: LegacyLineDatum | SingleSeriesDatum): item is LegacyLineDatum =>
  'month' in item;

export function LineChartCard({ title, data }: LineChartCardProps) {
  const hasLegacyShape = data.length > 0 && isLegacyDatum(data[0]);

  const normalizedData = hasLegacyShape
    ? (data as LegacyLineDatum[])
    : (data as SingleSeriesDatum[]).map((item) => ({
        month: item.label,
        orders: item.value,
        quotes: 0
      }));

  return (
    <Card className="xl:col-span-2">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={normalizedData}>
            <CartesianGrid stroke="#1f2a44" strokeDasharray="4 4" />
            <XAxis dataKey="month" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip />
            <Line type="monotone" dataKey="orders" stroke="#7c8cff" strokeWidth={2} dot={false} />
            {hasLegacyShape ? <Line type="monotone" dataKey="quotes" stroke="#38bdf8" strokeWidth={2} dot={false} /> : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
