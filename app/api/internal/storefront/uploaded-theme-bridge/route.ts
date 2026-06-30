import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tenantSlug = url.searchParams.get('tenantSlug') || '';
  const tenantId = url.searchParams.get('tenantId') || '';
  const channelSlug = url.searchParams.get('channelSlug') || url.searchParams.get('storeSlug') || 'default-store';

  const script = `
(function(){
  var TENANT_SLUG=${JSON.stringify(tenantSlug)};
  var TENANT_ID=${JSON.stringify(tenantId)};
  var CHANNEL_SLUG=${JSON.stringify(channelSlug)};
  var menuItems=[];
  var menuLoaded=false;
  var lastSignature='';
  function clean(value){return String(value||'').toLowerCase().replace(/^\\/+|\\/+$/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
  function path(value){var text=String(value||'/').trim(); if(!text)return '/'; if(/^https?:|mailto:|tel:/i.test(text))return text; return text.charAt(0)==='/'?text:'/'+text;}
  function go(value){var next=path(value); if(/^https?:|mailto:|tel:/i.test(next)){window.location.href=next;return;} try{window.history.pushState({},'',next);window.dispatchEvent(new Event('locationchange'));window.dispatchEvent(new PopStateEvent('popstate'));window.parent&&window.parent.postMessage({type:'holo-storefront:navigate',path:next},'*');}catch(e){window.location.href=next;}}
  function normalise(raw,index){raw=raw||{};var label=raw.label||raw.name||raw.title||raw.menuLabel||raw.path||('Menu '+(index+1));return Object.assign({},raw,{id:String(raw.id||raw.slug||raw.key||('menu-'+index)),slug:clean(raw.slug||label||raw.id||('menu-'+index)),label:label,path:path(raw.path||raw.href||raw.url||raw.link||'/'),enabled:raw.enabled!==false&&raw.status!=='hidden'&&raw.status!=='disabled',order:Number(raw.order||raw.sortOrder||raw.position||index+1),parentId:String(raw.parentId||raw.parent||raw.parentKey||''),parentSlug:clean(raw.parentSlug||raw.parentLabel||''),children:Array.isArray(raw.children)?raw.children.map(normalise).filter(function(x){return x.enabled;}):[]});}
  function splitMenu(items){var byParent={};var top=[];items.forEach(function(item){if(item.parentId||item.parentSlug){[item.parentId,item.parentSlug].filter(Boolean).forEach(function(key){byParent[String(key)]=byParent[String(key)]||[];byParent[String(key)].push(item);});}else top.push(item);});top.sort(function(a,b){return a.order-b.order;});return {top:top,byParent:byParent};}
  function childrenFor(item,map){var list=[].concat(item.children||[],map[String(item.id)]||[],map[String(item.slug)]||[],map[clean(item.label)]||[]);var seen={};return list.filter(function(child){var key=[child.id,child.slug,child.label,child.path].join('|');if(!child||child.enabled===false||seen[key])return false;seen[key]=true;return String(child.id)!==String(item.id)&&clean(child.label)!==clean(item.label);}).sort(function(a,b){return a.order-b.order;});}
  function navButtonTemplate(nav){return nav.querySelector('button,a');}
  function makeButton(template,item,hasChildren){var button=document.createElement('button');button.type='button';button.className=template&&template.className?template.className:'inline-flex items-center gap-1 text-[13px] font-semibold tracking-[-0.01em]';button.style.cssText=template&&template.style?template.style.cssText:'';button.innerHTML='';button.appendChild(document.createTextNode(item.label));if(hasChildren){var span=document.createElement('span');span.textContent='⌄';span.style.marginLeft='4px';button.appendChild(span);}button.addEventListener('click',function(event){event.preventDefault();go(item.path);});if(hasChildren){button.addEventListener('mouseenter',function(){showDropdown(item);});button.addEventListener('focus',function(){showDropdown(item);});}return button;}
  function removeDropdown(){var old=document.getElementById('print-admin-uploaded-menu-dropdown');if(old)old.remove();}
  function showDropdown(item){removeDropdown();var split=splitMenu(menuItems);var kids=childrenFor(item,split.byParent);if(!kids.length)return;var header=document.querySelector('header');var rect=header?header.getBoundingClientRect():{bottom:80};var box=document.createElement('div');box.id='print-admin-uploaded-menu-dropdown';box.style.cssText='position:fixed;left:50%;top:'+Math.max(70,rect.bottom+8)+'px;transform:translateX(-50%);width:min(1180px,calc(100vw - 40px));z-index:9999;background:#fff;border:1px solid #e3e8f0;border-radius:24px;box-shadow:0 30px 90px rgba(0,0,0,.14);padding:24px;font-family:inherit;color:#161a22;';box.onmouseleave=removeDropdown;var grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:260px repeat(3,minmax(0,1fr));gap:28px;align-items:start;';var feature=document.createElement('div');feature.innerHTML='<div style="height:132px;border-radius:16px;background:#e8f7fa;margin-bottom:16px;"></div><strong style="display:block;font-size:20px;margin-bottom:8px;">'+item.label+'</strong><p style="font-size:13px;line-height:1.7;color:#667487;margin:0 0 12px;">'+(item.description||'Browse menu links.')+'</p>';</script>
  var col=document.createElement('div');col.style.cssText='display:grid;gap:10px;';var title=document.createElement('div');title.textContent='Menu';title.style.cssText='font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#18a7d0;margin-bottom:6px;';col.appendChild(title);kids.forEach(function(child){var link=document.createElement('button');link.type='button';link.textContent=child.label;link.style.cssText='text-align:left;border:0;background:transparent;padding:8px 0;font:inherit;font-weight:700;color:#161a22;cursor:pointer;';link.onclick=function(){removeDropdown();go(child.path);};col.appendChild(link);});grid.appendChild(feature);grid.appendChild(col);box.appendChild(grid);document.body.appendChild(box);}
  function patchNav(){if(!menuLoaded||!menuItems.length)return;var nav=document.querySelector('header nav');if(!nav)return;var split=splitMenu(menuItems);if(!split.top.length)return;var signature=split.top.map(function(x){return x.id+':'+x.label+':'+x.path;}).join('|')+'|'+menuItems.length;if(nav.getAttribute('data-print-admin-menu')===signature)return;var template=navButtonTemplate(nav);nav.setAttribute('data-print-admin-menu',signature);nav.innerHTML='';split.top.slice(0,10).forEach(function(item){nav.appendChild(makeButton(template,item,childrenFor(item,split.byParent).length>0));});}
  function loadMenu(){var qs=new URLSearchParams();if(TENANT_ID)qs.set('tenantId',TENANT_ID);if(TENANT_SLUG)qs.set('tenantSlug',TENANT_SLUG);if(CHANNEL_SLUG)qs.set('channelSlug',CHANNEL_SLUG);fetch('/api/internal/storefront/menu-v2?'+qs.toString(),{cache:'no-store'}).then(function(r){return r.json();}).then(function(payload){var raw=(payload&&payload.data&&Array.isArray(payload.data.items))?payload.data.items:[];menuItems=raw.map(normalise).filter(function(x){return x.enabled&&x.label&&x.path;}).sort(function(a,b){return a.order-b.order;});menuLoaded=true;patchNav();}).catch(function(){menuLoaded=true;});}
  loadMenu();
  setInterval(patchNav,500);
  document.addEventListener('click',function(e){var d=document.getElementById('print-admin-uploaded-menu-dropdown');if(d&&!d.contains(e.target)&&!e.target.closest('header nav'))removeDropdown();});
})();`;

  return new NextResponse(script, {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
