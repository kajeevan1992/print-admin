'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, ShieldCheck, Wrench } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button, PrimaryButton } from '@/components/ui/buttons';
import { Input } from '@/components/forms/input';

type Report = { from:string; to:string; currency:string; summary:Record<string,number>; vat:Array<Record<string,number>>; issues:Array<Record<string,any>> };
type Run = { id:string; from:string; to:string; status:string; issueCount:number; criticalCount:number; invoiceGrossMinor:number; creditGrossMinor:number; createdAt:string };
function inputDate(value:Date){return value.toISOString().slice(0,10);}
function money(value:number,currency='GBP'){return new Intl.NumberFormat('en-GB',{style:'currency',currency}).format(Number(value||0)/100);}
function date(value:string){try{return value?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium'}).format(new Date(value)):'';}catch{return value;}}
function label(value:string){return String(value||'').replace(/[-_]/g,' ').replace(/\b\w/g,(letter)=>letter.toUpperCase());}

export function FinanceReconciliationPage(){
  const today=useMemo(()=>new Date(),[]);
  const [from,setFrom]=useState(inputDate(new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),1))));
  const [to,setTo]=useState(inputDate(today));
  const [storeSlug,setStoreSlug]=useState('');
  const [report,setReport]=useState<Report|null>(null);
  const [runs,setRuns]=useState<Run[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState('');
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const query=useMemo(()=>new URLSearchParams({from,to,...(storeSlug.trim()?{storeSlug:storeSlug.trim()}:{})}).toString(),[from,to,storeSlug]);
  async function load(){setLoading(true);setError('');try{const response=await fetch(`/api/internal/finance/reconciliation?${query}`,{cache:'no-store'});const payload=await response.json();if(!response.ok||payload?.ok===false)throw new Error(payload?.error||'Report failed.');setReport(payload.data.report);setRuns(payload.data.runs||[]);}catch(next){setError(next instanceof Error?next.message:'Report failed.');}finally{setLoading(false);}}
  async function run(action:'run'|'repair'){setBusy(action);setError('');setMessage('');try{const response=await fetch('/api/internal/finance/reconciliation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,from,to,storeSlug})});const payload=await response.json();if(!response.ok||payload?.ok===false)throw new Error(payload?.error||'Reconciliation failed.');setReport(payload.data.report);setRuns(payload.data.runs||[]);const repaired=payload.data.repaired||[];setMessage(action==='repair'?`Repair completed: ${repaired.filter((item:any)=>item.ok).length} fixed.`:'Reconciliation saved.');}catch(next){setError(next instanceof Error?next.message:'Reconciliation failed.');}finally{setBusy('');}}
  useEffect(()=>{void load();},[]);
  const currency=report?.currency||'GBP';
  const repairable=report?.issues.filter((item)=>['missing-invoice','missing-credit-note'].includes(item.code)).length||0;
  const exportUrl=(format:string)=>`/api/internal/finance/exports?${query}&format=${format}`;
  const summary=report?.summary||{};
  return <div><PageHeader title="Finance Reconciliation" subtitle="Match paid orders, invoices, credit notes and payment references; review VAT and export accounting CSV files." actions={<><Button onClick={()=>void load()} disabled={loading||!!busy}><RefreshCw size={14}/>Refresh</Button><PrimaryButton onClick={()=>void run('run')} disabled={loading||!!busy}><ShieldCheck size={14}/>{busy==='run'?'Running…':'Run & save'}</PrimaryButton></>}/>
    {message?<div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</div>:null}{error?<div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>:null}
    <Card className="mb-5"><div className="grid gap-4 md:grid-cols-4"><label><span className="mb-2 block text-xs uppercase text-textMuted">From</span><Input type="date" value={from} onChange={(event)=>setFrom(event.target.value)}/></label><label><span className="mb-2 block text-xs uppercase text-textMuted">To</span><Input type="date" value={to} onChange={(event)=>setTo(event.target.value)}/></label><label><span className="mb-2 block text-xs uppercase text-textMuted">Store slug</span><Input value={storeSlug} onChange={(event)=>setStoreSlug(event.target.value)} placeholder="All stores"/></label><div className="flex items-end"><Button className="w-full" onClick={()=>void load()}>Apply</Button></div></div></Card>
    {loading?<Card>Building reconciliation…</Card>:report?<><div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">{[['Invoices',summary.invoiceCount],['Credit notes',summary.creditNoteCount],['Net sales',money(summary.netSalesMinor,currency)],['Output VAT',money(summary.outputVatMinor,currency)],['Matched',`${summary.matchedCount}/${summary.paidOrderCount}`],['Exceptions',summary.issueCount]].map(([name,value])=><Card key={String(name)}><p className="text-xs uppercase text-textMuted">{name}</p><p className="mt-2 text-2xl font-semibold">{value}</p></Card>)}</div>
      <Card className="mb-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Accounting exports</h3><p className="mt-1 text-sm text-textMuted">Generated from immutable invoice and credit-note records.</p></div><div className="flex flex-wrap gap-2">{[['sales-ledger','Sales ledger'],['journal','Journal'],['vat','VAT summary'],['exceptions','Exceptions']].map(([key,text])=><a key={key} href={exportUrl(key)}><Button><Download size={14}/>{text}</Button></a>)}</div></div></Card>
      <div className="mb-5 grid gap-5 xl:grid-cols-[1fr_340px]"><Card><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Exceptions</h3><p className="text-sm text-textMuted">Amount, currency, duplicate-reference and partial-refund mismatches always remain manual-review items.</p></div>{repairable?<Button onClick={()=>void run('repair')} disabled={!!busy}><Wrench size={14}/>{busy==='repair'?'Repairing…':`Repair ${repairable} safe gap${repairable===1?'':'s'}`}</Button>:null}</div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-white/10 text-xs uppercase text-textMuted"><th className="p-3">Severity</th><th className="p-3">Issue</th><th className="p-3">Order</th><th className="p-3">Invoice</th><th className="p-3">Expected</th><th className="p-3">Actual</th></tr></thead><tbody>{report.issues.map((item)=><tr key={item.id} className="border-b border-white/5"><td className="p-3">{label(item.severity)}</td><td className="p-3"><strong>{label(item.code)}</strong><div className="mt-1 text-xs text-textMuted">{item.message}</div></td><td className="p-3">{item.orderNumber||'—'}</td><td className="p-3">{item.invoiceNumber||'—'}</td><td className="p-3">{money(item.expectedMinor,currency)}</td><td className="p-3">{money(item.actualMinor,currency)}</td></tr>)}{!report.issues.length?<tr><td colSpan={6} className="p-8 text-center text-emerald-300">No exceptions found.</td></tr>:null}</tbody></table></div></Card>
        <Card><h3 className="font-semibold">VAT by rate</h3><div className="mt-4 space-y-3">{report.vat.map((row)=><div key={row.rate} className="rounded-xl border border-white/8 p-4"><div className="flex justify-between"><strong>{row.rate}% VAT</strong><span>{money(row.netVatMinor,currency)}</span></div><div className="mt-2 flex justify-between text-xs text-textMuted"><span>Taxable sales</span><span>{money(row.netNetMinor,currency)}</span></div><div className="mt-1 flex justify-between text-xs text-textMuted"><span>Credits</span><span>{money(row.creditGrossMinor,currency)}</span></div></div>)}{!report.vat.length?<p className="text-sm text-textMuted">No VAT rows in this period.</p>:null}</div></Card></div>
      <Card><h3 className="font-semibold">Saved run history</h3><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-white/10 text-xs uppercase text-textMuted"><th className="p-3">Created</th><th className="p-3">Period</th><th className="p-3">Status</th><th className="p-3">Issues</th><th className="p-3">Gross</th><th className="p-3">Credits</th></tr></thead><tbody>{runs.map((item)=><tr key={item.id} className="border-b border-white/5"><td className="p-3">{date(item.createdAt)}</td><td className="p-3">{date(item.from)} – {date(item.to)}</td><td className="p-3">{label(item.status)}</td><td className="p-3">{item.issueCount} ({item.criticalCount} critical)</td><td className="p-3">{money(item.invoiceGrossMinor,currency)}</td><td className="p-3">{money(item.creditGrossMinor,currency)}</td></tr>)}</tbody></table></div></Card>
    </>:<Card>No report available.</Card>}
  </div>;
}
