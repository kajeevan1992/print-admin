import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tenantSlug = url.searchParams.get('tenantSlug') || '';
  const tenantId = url.searchParams.get('tenantId') || '';
  const channelSlug = url.searchParams.get('channelSlug') || url.searchParams.get('storeSlug') || 'default-store';

  const script = [
    '(function(){',
    `var tenantSlug=${JSON.stringify(tenantSlug)};`,
    `var tenantId=${JSON.stringify(tenantId)};`,
    `var channelSlug=${JSON.stringify(channelSlug)};`,
    'var items=[];var loaded=false;',
    'function c(v){return String(v||"").toLowerCase().replace(/^\\/+|\\/+$/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");}',
    'function p(v){v=String(v||"/").trim();if(!v)return "/";if(/^https?:|mailto:|tel:/i.test(v))return v;return v[0]==="/"?v:"/"+v;}',
    'function go(v){var x=p(v);if(/^https?:|mailto:|tel:/i.test(x)){location.href=x;return;}history.pushState({},"",x);window.dispatchEvent(new Event("locationchange"));window.dispatchEvent(new PopStateEvent("popstate"));parent&&parent.postMessage({type:"holo-storefront:navigate",path:x},"*");}',
    'function n(r,i){r=r||{};var label=r.label||r.name||r.title||r.path||("Menu "+(i+1));return Object.assign({},r,{id:String(r.id||r.slug||label),slug:c(r.slug||label),label:label,path:p(r.path||r.href||r.url||"/"),enabled:r.enabled!==false,order:Number(r.order||r.sortOrder||i+1),parentId:String(r.parentId||""),parentSlug:c(r.parentSlug||""),description:r.description||"",imageUrl:r.imageUrl||r.image||"",children:Array.isArray(r.children)?r.children.map(n).filter(function(x){return x.enabled;}):[]});}',
    'function split(){var top=[],map={};items.forEach(function(x){if(x.parentId||x.parentSlug){[x.parentId,x.parentSlug].filter(Boolean).forEach(function(k){map[String(k)]=map[String(k)]||[];map[String(k)].push(x);});}else top.push(x);});top.sort(function(a,b){return a.order-b.order;});return {top:top,map:map};}',
    'function kids(x,m){var a=[].concat(x.children||[],m[String(x.id)]||[],m[String(x.slug)]||[],m[c(x.label)]||[]),s={};return a.filter(function(y){if(!y)return false;var k=[y.id,y.slug,y.label,y.path].join("|");if(s[k])return false;s[k]=true;return String(y.id)!==String(x.id)&&c(y.label)!==c(x.label);}).sort(function(a,b){return a.order-b.order;});}',
    'function close(){var d=document.getElementById("pa-menu-dd");if(d)d.remove();}',
    'function dd(x){close();var sp=split(),ks=kids(x,sp.map);if(!ks.length)return;var h=document.querySelector("header"),r=h?h.getBoundingClientRect():{bottom:80};var d=document.createElement("div");d.id="pa-menu-dd";d.style.cssText="position:fixed;left:50%;top:"+(r.bottom+8)+"px;transform:translateX(-50%);width:min(1180px,calc(100vw - 40px));z-index:9999;background:#fff;border:1px solid #e3e8f0;border-radius:24px;box-shadow:0 30px 90px rgba(0,0,0,.14);padding:24px;font-family:inherit;color:#161a22";d.onmouseleave=close;var grid=document.createElement("div");grid.style.cssText="display:grid;grid-template-columns:260px repeat(3,minmax(0,1fr));gap:28px";var intro=document.createElement("div");intro.innerHTML="<strong style=\"display:block;font-size:20px;margin-bottom:8px\">"+x.label+"</strong><p style=\"font-size:13px;line-height:1.7;color:#667487\">"+(x.description||"Browse menu links.")+"</p>";var col=document.createElement("div");col.style.cssText="display:grid;gap:10px";ks.forEach(function(k){var b=document.createElement("button");b.type="button";b.textContent=k.label;b.style.cssText="text-align:left;border:0;background:transparent;padding:8px 0;font:inherit;font-weight:700;cursor:pointer";b.onclick=function(){close();go(k.path);};col.appendChild(b);});grid.appendChild(intro);grid.appendChild(col);d.appendChild(grid);document.body.appendChild(d);}',
    'function patch(){if(!loaded||!items.length)return;var nav=document.querySelector("header nav");if(!nav)return;var sp=split();if(!sp.top.length)return;var wanted=sp.top.map(function(x){return x.label;}).join("|");if(nav.getAttribute("data-pa-menu-labels")===wanted&&nav.textContent&&nav.textContent.indexOf(sp.top[0].label)>-1&&nav.children.length===sp.top.slice(0,10).length)return;var t=nav.querySelector("button,a");nav.setAttribute("data-pa-menu-labels",wanted);nav.innerHTML="";sp.top.slice(0,10).forEach(function(x){var b=document.createElement("button");b.type="button";b.className=t&&t.className?t.className:"inline-flex items-center gap-1 text-[13px] font-semibold tracking-[-0.01em]";b.style.cssText=t&&t.style?t.style.cssText:"";var has=kids(x,sp.map).length>0;b.textContent=x.label+(has?"⌄":"");b.onclick=function(e){e.preventDefault();go(x.path);};if(has){b.onmouseenter=function(){dd(x);};b.onfocus=function(){dd(x);};}nav.appendChild(b);});}',
    'function load(){var q=new URLSearchParams();if(tenantId)q.set("tenantId",tenantId);if(tenantSlug)q.set("tenantSlug",tenantSlug);if(channelSlug)q.set("channelSlug",channelSlug);fetch("/api/internal/storefront/menu-v2?"+q.toString(),{cache:"no-store"}).then(function(r){return r.json();}).then(function(j){var raw=j&&j.data&&Array.isArray(j.data.items)?j.data.items:[];items=raw.map(n).filter(function(x){return x.enabled&&x.label&&x.path;});loaded=true;patch();}).catch(function(){loaded=true;});}',
    'load();setInterval(patch,150);new MutationObserver(patch).observe(document.documentElement,{childList:true,subtree:true});document.addEventListener("click",function(e){var d=document.getElementById("pa-menu-dd");if(d&&!d.contains(e.target)&&!e.target.closest("header nav"))close();});',
    '})();',
  ].join('\n');

  return new NextResponse(script, { headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store' } });
}
