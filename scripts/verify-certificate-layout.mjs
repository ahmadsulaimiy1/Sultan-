import { chromium } from 'playwright-core';
import { readdirSync } from 'node:fs';
const DIR='dist/certificates/2026-08-08-IBT-000035';
const files=readdirSync(DIR).filter(f=>/^\d{6}-\d{15}\.html$/.test(f)).sort();
const exe='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b=await chromium.launch({executablePath:exe});
const ctx=await b.newContext({viewport:{width:1200,height:860},deviceScaleFactor:3});
const out=[];
for(const f of files){
  const p=await ctx.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));
  p.on('requestfailed',r=>errs.push('asset failed: '+r.url()));
  await p.goto(`http://localhost:8901/${DIR}/${f}`,{waitUntil:'networkidle'});
  await p.waitForTimeout(900);
  const r=await p.evaluate(()=>{
    const sheet=document.querySelector('.sheet').getBoundingClientRect();
    const kx=297/sheet.width, ky=210/sheet.height;
    const sels=['.o5-intro-en','.o5-intro-ar','.o5-name-en','.o5-name-ar','.o5-name-rule',
      '.o5-para-en','.o5-para-ar','.o8-band','.o5-sig-1','.o5-sig-2','.o5-seal','.o5-vplate',
      '.o5-basmala','.o5-holo','.o9-title','.o5-cnplate'];
    const boxes=[];
    for(const s of sels){const el=document.querySelector(s); if(!el) continue;
      let rc; if(el.children.length===0&&el.textContent.trim()){const g=document.createRange();g.selectNodeContents(el);rc=g.getBoundingClientRect();}else rc=el.getBoundingClientRect();
      boxes.push({s,x0:(rc.left-sheet.left)*kx,x1:(rc.right-sheet.left)*kx,y0:(rc.top-sheet.top)*ky,y1:(rc.bottom-sheet.top)*ky});}
    const hits=[];
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
      const a=boxes[i],c=boxes[j];
      const ox=Math.min(a.x1,c.x1)-Math.max(a.x0,c.x0), oy=Math.min(a.y1,c.y1)-Math.max(a.y0,c.y0);
      if(ox>0.4&&oy>0.4)hits.push(`${a.s} x ${c.s} (${ox.toFixed(1)}x${oy.toFixed(1)}mm)`);}
    const off=boxes.filter(x=>x.x0<-0.5||x.y0<-0.5||x.x1>297.5||x.y1>210.5).map(x=>x.s);
    // real clipping only: elements whose computed overflow actually hides content
    const clipped=[];
    for(const el of document.querySelectorAll('.sheet *')){
      const cs=getComputedStyle(el);
      if(cs.overflow==='hidden'||cs.overflowX==='hidden'){
        if(el.scrollWidth-el.clientWidth>1 && !el.className.includes('micro'))
          clipped.push(`${el.className}: ${el.scrollWidth-el.clientWidth}px hidden`);
      }
    }
    return {collisions:hits, offSheet:off, clipped};
  });
  await (await p.$('.o5-vplate .vp-qr')).screenshot({path:`/tmp/qr-${f.slice(0,6)}.png`});
  out.push({file:f, ...r, errors:errs});
  await p.close();
}
console.log(JSON.stringify(out,null,1));
await b.close();
