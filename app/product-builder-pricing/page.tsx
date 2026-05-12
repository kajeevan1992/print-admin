'use client';

export const dynamic = 'force-dynamic';

import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/forms/input';

function money(v:number){return new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(v/100)}
function n(v:string,f=0){const x=Number(v);return Number.isFinite(x)?x:f}

export default function ProductBuilderPricingPage(){
const [qty,setQty]=useState('500')
const [material,setMaterial]=useState('0.12')
const [click,setClick]=useState('0.01')
const [machineHr,setMachineHr]=useState('35')
const [machineMin,setMachineMin]=useState('25')
const [labourHr,setLabourHr]=useState('18')
const [labourMin,setLabourMin]=useState('35')
const [prepressHr,setPrepressHr]=useState('25')
const [prepressMin,setPrepressMin]=useState('10')
const [packing,setPacking]=useState('1.50')
const [outsource,setOutsource]=useState('0')
const [waste,setWaste]=useState('5')
const [overhead,setOverhead]=useState('12')
const [margin,setMargin]=useState('35')
const estimate=useMemo(()=>{const q=n(qty,1);const materialMinor=Math.round(n(material)*100*q);const clickMinor=Math.round(n(click)*100*q);const machineMinor=Math.round((n(machineMin)/60)*(n(machineHr)*100));const labourMinor=Math.round((n(labourMin)/60)*(n(labourHr)*100));const prepressMinor=Math.round((n(prepressMin)/60)*(n(prepressHr)*100));const packingMinor=Math.round(n(packing)*100);const outsourceMinor=Math.round(n(outsource)*100);const direct=materialMinor+clickMinor+machineMinor+labourMinor+prepressMinor+packingMinor+outsourceMinor;const wasteMinor=Math.round(direct*(n(waste)/100));const subtotal=direct+wasteMinor;const overheadMinor=Math.round(subtotal*(n(overhead)/100));const total=subtotal+overheadMinor;const sell=Math.round(total/(1-(n(margin)/100)));const profit=sell-total;return{materialMinor,clickMinor,machineMinor,labourMinor,prepressMinor,packingMinor,outsourceMinor,wasteMinor,overheadMinor,total,sell,profit,unit:Math.round(sell/q),margin:n(margin)}},[qty,material,click,machineHr,machineMin,labourHr,labourMin,prepressHr,prepressMin,packing,outsource,waste,overhead,margin])
return <div className="space-y-6"><PageHeader title="Unified Pricing + Manufacturing Cost Engine" subtitle="Live manufacturing estimating using machine, labour, material, prepress, finishing and outsource costs."/><div className="grid gap-4 xl:grid-cols-[1fr_420px]"><Card className="space-y-4"><h3 className="text-lg font-semibold text-white">v374 Manufacturing Inputs</h3><div className="grid gap-4 md:grid-cols-3"><Input type="number" value={qty} onChange={e=>setQty(e.target.value)} placeholder="Quantity"/><Input type="number" value={material} onChange={e=>setMaterial(e.target.value)} placeholder="Material £/unit"/><Input type="number" value={click} onChange={e=>setClick(e.target.value)} placeholder="Click £/unit"/><Input type="number" value={machineHr} onChange={e=>setMachineHr(e.target.value)} placeholder="Machine £/hr"/><Input type="number" value={machineMin} onChange={e=>setMachineMin(e.target.value)} placeholder="Machine min"/><Input type="number" value={labourHr} onChange={e=>setLabourHr(e.target.value)} placeholder="Labour £/hr"/><Input type="number" value={labourMin} onChange={e=>setLabourMin(e.target.value)} placeholder="Labour min"/><Input type="number" value={prepressHr} onChange={e=>setPrepressHr(e.target.value)} placeholder="Prepress £/hr"/><Input type="number" value={prepressMin} onChange={e=>setPrepressMin(e.target.value)} placeholder="Prepress min"/><Input type="number" value={packing} onChange={e=>setPacking(e.target.value)} placeholder="Packing £"/><Input type="number" value={outsource} onChange={e=>setOutsource(e.target.value)} placeholder="Outsource £"/><Input type="number" value={waste} onChange={e=>setWaste(e.target.value)} placeholder="Waste %"/><Input type="number" value={overhead} onChange={e=>setOverhead(e.target.value)} placeholder="Overhead %"/><Input type="number" value={margin} onChange={e=>setMargin(e.target.value)} placeholder="Target margin %"/></div></Card><div className="space-y-4"><Card><div className="flex items-center gap-2 text-white"><Calculator size={18}/><h3 className="font-semibold">Live estimate</h3></div><div className="mt-4 space-y-2 text-sm"><Row label="Material" value={money(estimate.materialMinor)}/><Row label="Click charges" value={money(estimate.clickMinor)}/><Row label="Machine cost" value={money(estimate.machineMinor)}/><Row label="Labour cost" value={money(estimate.labourMinor)}/><Row label="Prepress" value={money(estimate.prepressMinor)}/><Row label="Packing" value={money(estimate.packingMinor)}/><Row label="Outsource" value={money(estimate.outsourceMinor)}/><Row label="Waste" value={money(estimate.wasteMinor)}/><Row label="Overhead" value={money(estimate.overheadMinor)}/><Row label="Manufacturing cost" value={money(estimate.total)}/><Row label="Sell price" value={money(estimate.sell)}/><Row label="Profit" value={money(estimate.profit)}/><Row label="Margin" value={`${estimate.margin}%`}/><Row label="Unit sell" value={money(estimate.unit)}/></div></Card></div></div></div>}
function Row({label,value}:{label:string,value:string}){return <div className="flex items-center justify-between border-b border-white/6 pb-2"><span className="text-textMuted">{label}</span><span className="font-semibold text-white">{value}</span></div>}
