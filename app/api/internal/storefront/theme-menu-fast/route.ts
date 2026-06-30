import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const script = `
(function(){
  function path(v){v=String(v||'/').trim();return !v?'/':(/^https?:|mailto:|tel:/i.test(v)||v[0]=='/'?v:'/'+v);}
  function clean(v){return String(v||'').toLowerCase().replace(/^\\/+|\\/+$/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
  function normalise(raw,i){raw=raw||{};var label=raw.label||raw.name||raw.title||raw.path||('Menu '+(i+1));return {id:String(raw.id||raw.slug||label),slug:clean(raw.slug||label),label:label,path:path(raw.path||raw.href||raw.url||'/'),enabled:raw.enabled!==false,parentId:String(raw.parentId||''),parentSlug:clean(raw.parentSlug||''),order:Number(raw.order||raw.sortOrder||i+1)};}
  function go(v){var x=path(v);if(/^https?:|mailto:|tel:/i.test(x)){location.href=x;return;}history.pushState({},'',x);window.dispatchEvent(new Event('locationchange'));}
  function read(){var raw=Array.isArray(window.__PRINT_ADMIN_MENU_ITEMS__)?window.__PRINT_ADMIN_MENU_ITEMS__:[];return raw.map(normalise).filter(function(x){return x.enabled&&x.label&&x.path;});}
  function apply(){var items=read();var top=items.filter(function(x){return !x.parentId&&!x.parentSlug;}).sort(function(a,b){return a.order-b.order;});if(!top.length)return false;var nav=document.querySelector('header nav');if(!nav)return false;var labels=top.slice(0,10).map(function(x){return x.label;}).join('|');if(nav.getAttribute('data-pa-menu-labels')===labels&&nav.children.length===top.slice(0,10).length)return true;var sample=nav.querySelector('button,a');nav.innerHTML='';top.slice(0,10).forEach(function(item){var b=document.createElement('button');b.type='button';b.className=sample&&sample.className?sample.className:'inline-flex items-center gap-1 text-[13px] font-semibold tracking-[-0.01em]';b.style.cssText=sample&&sample.style?sample.style.cssText:'';b.textContent=item.label;var hasChild=items.some(function(x){return x.parentId===item.id||x.parentSlug===item.slug||x.parentSlug===clean(item.label);});if(hasChild)b.textContent+='⌄';b.onclick=function(e){e.preventDefault();go(item.path);};nav.appendChild(b);});nav.setAttribute('data-pa-menu-labels',labels);return true;}
  function unhideIfEmpty(){if(read().length)return;var s=document.getElementById('print-admin-no-old-nav');if(s)s.remove();}
  function fetchFresh(){var q=new URLSearchParams();if(window.__HOLO_TENANT_ID)q.set('tenantId',window.__HOLO_TENANT_ID);if(window.__HOLO_TENANT_SLUG)q.set('tenantSlug',window.__HOLO_TENANT_SLUG);if(window.__HOLO_CHANNEL_SLUG)q.set('channelSlug',window.__HOLO_CHANNEL_SLUG);fetch('/api/internal/storefront/menu-v2?'+q.toString(),{cache:'no-store'}).then(function(r){return r.json();}).then(function(j){var raw=j&&j.data&&Array.isArray(j.data.items)?j.data.items:[];if(raw.length){window.__PRINT_ADMIN_MENU_ITEMS__=raw;apply();}else{unhideIfEmpty();}}).catch(unhideIfEmpty);}
  apply();fetchFresh();setInterval(function(){if(!apply())unhideIfEmpty();},120);new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
})();`;
  return new NextResponse(script, { headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store' } });
}
