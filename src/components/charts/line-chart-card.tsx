import { Card } from '@/components/ui/card';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function LineChartCard({ title, data }: { title: string; data: Array<{ month: string; orders: number; quotes: number }> }) {
  return (
    <Card className="xl:col-span-2">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="#1f2a44" strokeDasharray="4 4" />
            <XAxis dataKey="month" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip />
            <Line type="monotone" dataKey="orders" stroke="#7c8cff" strokeWidth={2} />
            <Line type="monotone" dataKey="quotes" stroke="#38bdf8" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
