'use client';

import { useEffect, useState } from 'react';

export default function ProductionPlannerPage() {
  const [data, setData] = useState<any>(null);

  async function load() {
    const res = await fetch('/api/internal/catalog/production-planner');
    const json = await res.json();
    setData(json.data);
  }

  async function action(jobId: string, action: string) {
    await fetch('/api/internal/catalog/production-planner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, action })
    });
    load();
  }

  useEffect(() => {
    load();
  }, []);

  if (!data) return <div>Loading planner...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>
        Production Planner
      </h1>

      {['queued','prepress','print','finish','dispatch','completed'].map(stage => (
        <div key={stage} style={{ marginBottom: 30 }}>
          <h2 style={{ fontSize: 20 }}>{stage.toUpperCase()}</h2>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {data.jobs
              .filter((j: any) => j.stage === stage)
              .map((job: any) => (
                <div
                  key={job.id}
                  style={{
                    border: '1px solid #333',
                    padding: 12,
                    borderRadius: 8,
                    width: 250
                  }}
                >
                  <b>{job.orderNumber}</b>
                  <p>{job.customerName}</p>
                  <p>Machine: {job.laneName}</p>
                  <p>Status: {job.status}</p>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => action(job.id, 'start')}>
                      Start
                    </button>
                    <button onClick={() => action(job.id, 'advance')}>
                      Next
                    </button>
                    <button onClick={() => action(job.id, 'hold')}>
                      Hold
                    </button>
                    <button onClick={() => action(job.id, 'complete')}>
                      Done
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
