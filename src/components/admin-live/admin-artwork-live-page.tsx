'use client';

import { useCallback, useEffect, useState } from 'react';

type ArtworkRow = { id:string; orderReference:string; customerEmail:string; fileName:string; fileType:string; status:string };
const fallbackRows: ArtworkRow[] = [
  { id:'a1', orderReference:'ORD-1001', customerEmail:'ava@example.com', fileName:'business-cards-proof.pdf', fileType:'PDF', status:'pending-review' },
  { id:'a2', orderReference:'ORD-1002', customerEmail:'leo@example.com', fileName:'mailer-box-artwork.ai', fileType:'AI', status:'awaiting-customer-fix' },
];

export function AdminArtworkLivePage() {
  const [rows,setRows]=useState<ArtworkRow[]>(fallbackRows);
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState('Connecting to live artwork API...');
  const [source,setSource]=useState<'live'|'fallback'>('fallback');

  const loadRows = useCallback(async()=>{
    try{
      const res=await fetch('/api/proxy/admin-artwork',{cache:'no-store'});
      const payload=await res.json().catch(()=>null);
      if(!res.ok || !payload?.ok){setRows(fallbackRows);setSource('fallback');setMessage('Live artwork endpoint is not available yet. Showing fallback rows.');return;}
      const raw=payload?.payload?.data || payload?.payload || [];
      const normalized=Array.isArray(raw)?raw.map((a:any)=>({
        id:a.id||'',
        orderReference:a.orderReference||a.order?.orderNumber||a.orderId||'—',
        customerEmail:a.customerEmail||a.order?.email||'—',
        fileName:a.fileName||'Artwork file',
        fileType:a.fileType||'Unknown',
        status:a.status||'unknown'
      })):[];
      setRows(normalized.length?normalized:fallbackRows);setSource(normalized.length?'live':'fallback');setMessage(normalized.length?'Connected to live artwork data.':'Artwork endpoint returned no rows. Showing fallback rows.');
    }catch{
      setRows(fallbackRows);setSource('fallback');setMessage('Could not reach the artwork endpoint. Showing fallback rows.');
    }finally{setLoading(false);}
  },[]);

  useEffect(()=>{loadRows()},[loadRows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Artwork Proofing</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>Live-first artwork queue route replacement.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}>Source: {source === 'live' ? 'Live API' : 'Fallback'}</span>
          <button type="button" className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }} onClick={()=>{setLoading(true);loadRows();}}>{loading?'Refreshing...':'Refresh'}</button>
        </div>
      </div>
      <div className="rounded-3xl border p-4" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface)' }}>
        <div className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: 'var(--theme-border)', background: 'var(--theme-surface-alt)', color: 'var(--theme-text-muted)' }}>
          {loading ? 'Loading artwork...' : message}
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--theme-border)' }}>
          <div className="grid grid-cols-5 gap-3 border-b px-4 py-3 text-xs font-medium uppercase tracking-[0.16em]" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}>
            <div>Order</div><div>Email</div><div>File</div><div>Type</div><div>Status</div>
          </div>
          {rows.map((row)=>(
            <div key={row.id} className="grid grid-cols-5 gap-3 border-b px-4 py-3 text-sm last:border-b-0" style={{ borderColor:'var(--theme-border)', background:'var(--theme-surface-alt)' }}>
              <div>{row.orderReference}</div><div>{row.customerEmail}</div><div>{row.fileName}</div><div>{row.fileType}</div><div>{row.status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
