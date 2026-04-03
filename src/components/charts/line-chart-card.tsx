'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Card } from '@/components/ui/card';

type ChartPoint = {
  label?: string;
  name?: string;
  value: number;
};

export function LineChartCard({
  title,
  data
}: {
  title: string;
  data: ChartPoint[];
}) {
  const normalized = data.map((item) => ({
    name: item.label ?? item.name ?? '',
    value: item.value
  }));

  return (
    <Card className="p-5">
      <h3 className="mb-4 text-2xl font-semibold">{title}</h3>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={normalized}>
            <CartesianGrid strokeDasharray="3 3" stroke="#23314d" />
            <XAxis dataKey="name" stroke="#7183a6" />
            <YAxis stroke="#7183a6" />
            <Tooltip />
            <Line type="monotone" dataKey="value" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
