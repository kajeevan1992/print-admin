'use client';

import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { kpis, salesSeries, activityLog, referrers, apiUsage } from '@/data/mock-data';
import { CartesianGrid, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';

const colors = ['#7c8cff', '#38bdf8', '#818cf8', '#a78bfa'];

export function DashboardPage() {
  return (
    <div>
      <PageHeader title="Welcome back, Alex" subtitle="Here is a live snapshot of platform health, conversion, and production flow." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <p className="text-sm text-textMuted">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold">{kpi.value}</p>
            <p className="mt-1 text-xs text-accentAlt">{kpi.trend}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h3 className="mb-3 text-sm font-semibold">Orders vs Quotes</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesSeries}>
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

        <Card>
          <h3 className="mb-3 text-sm font-semibold">API Usage Split</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={apiUsage} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90}>
                  {apiUsage.map((entry, i) => (
                    <Cell key={entry.name} fill={colors[i % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-semibold">Conversion Funnel Summary</h3>
          <ul className="space-y-2 text-sm">
            <li>Traffic → Product View: <span className="text-accentAlt">62%</span></li>
            <li>Product View → Quote Request: <span className="text-accentAlt">27%</span></li>
            <li>Quote → Paid Order: <span className="text-accentAlt">31.7%</span></li>
          </ul>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold">Recent Activity</h3>
          <ul className="space-y-2 text-sm text-textMuted">
            {activityLog.map((item) => (
              <li key={item} className="rounded-lg border border-border bg-panelMuted px-3 py-2">{item}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <h3 className="mb-3 text-sm font-semibold">Top Referrers</h3>
        <table className="w-full text-left text-sm">
          <thead className="text-textMuted">
            <tr>
              <th className="pb-2">Source</th>
              <th className="pb-2">Sessions</th>
              <th className="pb-2">Conversion</th>
            </tr>
          </thead>
          <tbody>
            {referrers.map((ref) => (
              <tr key={ref.source} className="border-t border-border">
                <td className="py-3">{ref.source}</td>
                <td>{ref.sessions.toLocaleString()}</td>
                <td>{ref.conversion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
