'use client';

import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Card } from '@/components/ui/card';

type PiePoint = {
  name: string;
  value: number;
};

const fallbackColors = ['#8b5cf6', '#6366f1', '#38bdf8', '#14b8a6', '#f59e0b'];

export function PieChartCard({
  title,
  data
}: {
  title: string;
  data: PiePoint[];
}) {
  return (
    <Card className="p-5">
      <h3 className="mb-4 text-2xl font-semibold">{title}</h3>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={3}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={fallbackColors[index % fallbackColors.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
