(function(){
 'use strict';
 const family=window.GFFamilies.recycle;
 let keyboardInput=false,inputBound=false;
 // 한 장 한 규칙: 도감 · 끝 화면과 같은 철판 테두리 안에 크림 판 한 장(10-27 저녁), 놀이 그림은 기존 조각에서 잘라 쓴다.
 const BIN_INK={paper:'#245d96',plastic:'#41652d',can:'#805d00',glass:'#9b3b5b',vinyl:'#715099',general:'#55504b',pet:'#176b63',carton:'#81502c',foam:'#9c4a0b'};
 const css3=`
 .rcs-v3,.rcs-v3 *{box-sizing:border-box}
 .rcs-v3{position:relative!important;display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:16px!important;width:min(1320px,calc(100vw - 48px))!important;max-height:none!important;margin:0!important;padding:calc(var(--ring) + 20px)!important;border:0!important;border-radius:20px!important;background:#fff8e8!important;box-shadow:0 7px 20px #251c2640!important;isolation:isolate;color:#302e27!important;text-align:center!important;font-family:Jua,sans-serif!important;overflow:visible!important;--item:128px;--bin:154px;--cap:20px;--arrow:clamp(30px,2.6vw,44px);--ring:24px}
 .rcs-v3[data-framed]{background:none!important;box-shadow:none!important;border-radius:0!important}
 .rcs-v3 .rcs-frame{position:absolute;inset:0;z-index:-1;width:100%;height:100%;pointer-events:none;filter:drop-shadow(0 6px 12px #251c2659)}
 .rcs-v3 [hidden],.rcs-v3 .rcs-page:not(.rcs-on){display:none!important}
 .rcs-v3 .rcs-page{display:grid;gap:18px;min-width:0}
 .rcs-v3 .rcs-head{display:grid;grid-template-columns:96px minmax(0,1fr);align-items:center;gap:20px;padding-right:calc(36px + var(--close-shift,0px))}
 .rcs-v3 .rcs-face{width:96px;height:96px;border-radius:50%;background:#e0e8ce}
 .rcs-v3 .rcs-copy{min-width:0;text-align:left}
 .rcs-v3 .rcs-sign{margin:0 0 6px!important;padding:0!important;min-height:0!important;font:16px/1.3 Jua,sans-serif!important;color:#71614b!important}
 .rcs-v3 .rcs-text,.rcs-v3 .rcs-goal{margin:0!important;padding:12px 18px!important;border:0!important;border-radius:12px;background:#f5edd9!important;font:700 40px/1.22 Jua,sans-serif!important;color:#302e27!important;word-break:keep-all;overflow-wrap:anywhere}
 .rcs-v3 .rcs-rows{display:grid;gap:14px;min-width:0}
 .rcs-v3 .rcs-flow{display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:32px;align-items:start;min-width:0}
 .rcs-v3 .rcs-cell{position:relative;min-width:0}
 .rcs-v3 .rcs-cell:has(.rcs-arrow){padding-right:var(--arrow)}
 .rcs-v3 .rcs-fig{display:grid;grid-template-columns:minmax(0,1fr);justify-items:center;gap:6px;min-width:0;margin:0}
 .rcs-v3 .rcs-bay{position:relative;display:grid;place-items:center;width:100%;height:var(--bin);isolation:isolate}
 .rcs-v3 .rcs-bay:before{content:"";position:absolute;z-index:-1;bottom:0;width:min(100%,calc(var(--item)*1.3));height:70%;border-radius:50%;background:#d9edf3}
 .rcs-v3 .rcs-correct .rcs-bay:before{background:#dcebc3}
 .rcs-v3 .rcs-object{display:block;width:var(--item);height:var(--item)}
 .rcs-v3 .rcs-correct .rcs-object{width:calc(var(--bin)*.72);height:var(--bin)}
 .rcs-v3 .rcs-cap{width:100%;max-width:100%;min-width:0;margin:0;font:700 var(--cap)/1.2 Jua,sans-serif;color:#302e27;word-break:keep-all;overflow-wrap:anywhere}
 .rcs-v3 .rcs-arrow{position:absolute;right:0;top:calc(var(--bin)*.45);width:var(--arrow);height:var(--arrow);color:#4d7737;z-index:1}
 .rcs-v3 .rcs-number{display:grid;place-items:center;width:26px;height:26px;margin:0 auto 6px;border-radius:50%;background:#e5d7b9;color:#4a3626;font:700 18px/1 Jua,sans-serif}
 .rcs-v3 .rcs-flow:has(.rcs-number) .rcs-arrow{top:calc(var(--bin)*.45 + 32px)}
 .rcs-v3 .rcs-wrong{display:flex;align-items:center;justify-content:center;gap:8px;opacity:.7;margin-top:4px}
 .rcs-v3 .rcs-wrong-bay{position:relative;display:block;flex:none}
 .rcs-v3 .rcs-wrong .rcs-object{width:calc(var(--bin)*.36);height:calc(var(--bin)*.5)}
 .rcs-v3 .rcs-wrong-bay:after{content:"";position:absolute;left:0;top:calc(50% - 1.5px);width:100%;height:3px;border-radius:3px;background:#bb4940;transform:rotate(55deg)}
 .rcs-v3 .rcs-wrong .rcs-cap{width:auto;font-size:max(15px,calc(var(--cap)*.8));color:#745549}
 .rcs-v3 .rcs-recap{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 24px}
 .rcs-v3 .rcs-recap .rcs-flow{gap:24px}
 .rcs-v3 .rcs-criteria{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;padding:16px 0}
 .rcs-v3 .rcs-condition{display:grid;justify-items:center;align-content:start;gap:8px;min-width:0}
 .rcs-v3 .rcs-star{width:64px;height:64px}
 .rcs-v3 .rcs-condition p{margin:0;font:700 22px/1.35 Jua,sans-serif;word-break:keep-all;overflow-wrap:anywhere}
 .rcs-v3 .rcs-stats{display:flex;justify-content:center;gap:24px}
 .rcs-v3 .rcs-stat{display:flex;align-items:center;gap:8px;font:22px/1.3 Jua,sans-serif}
 .rcs-v3 .rcs-symbol{width:28px;height:28px}
 .rcs-v3 .rcs-side{display:grid;justify-items:center;gap:10px;position:relative;padding-bottom:0}
 .rcs-v3 .rcs-dots{display:flex;gap:10px;height:12px;align-items:center}
 .rcs-v3 .rcs-dot{width:10px;height:10px;border-radius:50%;background:#cbc4b2}
 .rcs-v3 .rcs-dot[data-frame="0"]{background:#4d7737}
 .rcs-v3 .rcs-keys{position:absolute;bottom:19px;left:auto;right:0;margin:0;font:15px/1.2 Jua,sans-serif;color:#71614b}
 .rcs-v3 .rcs-nav{display:grid;justify-items:center;width:100%}
 .rcs-v3 .rcs-button{position:static!important;inset:auto!important;display:grid!important;place-items:center;grid-column:auto!important;width:300px!important;min-width:260px!important;min-height:56px!important;margin:0!important;padding:8px 20px!important;border:0!important;border-radius:14px!important;background:#527638!important;box-shadow:none!important;color:#fff8e8!important;font:700 28px/1.2 Jua,sans-serif!important;cursor:pointer}
 .rcs-v3 .rcs-button[hidden]{display:none!important}
 .rcs-v3 .rcs-big{border-radius:8px!important;background:linear-gradient(#64834a,#527638)!important;box-shadow:inset 0 2px 0 #aac08b,inset 0 -3px 0 #355126,inset 2px 0 0 #83a264,inset -2px 0 0 #3d5d2a!important;text-shadow:0 2px 0 #355126}
 .rcs-v3 .rcs-skip{position:absolute!important;left:0!important;bottom:6px!important;width:auto!important;min-width:0!important;min-height:44px!important;padding:4px 8px!important;background:none!important;color:#4a3626!important;font-size:16px!important;text-decoration:underline}
 .rcs-v3 .rcs-close{position:absolute!important;right:calc(var(--ring) + 10px + var(--close-shift,0px))!important;top:calc(var(--ring) + 10px)!important;display:grid!important;place-items:center;width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;padding:0!important;border:0!important;border-radius:50%!important;background:#efe5cf!important;box-shadow:inset 0 1px 0 #fff8e8,inset 0 -2px 0 #d8c6a5!important;color:#4a3626!important;font:28px/1 sans-serif!important;cursor:pointer}
 .rcs-v3 button:focus{outline:none!important}
 .rcs-v3[data-input=keyboard] button:focus-visible{outline:3px solid #a56b12!important;outline-offset:3px!important}
 .rcs-v3 button:active{translate:0 1px}
 @media(max-width:1100px) and (min-height:501px){.rcs-v3 .rcs-text,.rcs-v3 .rcs-goal{font-size:34px!important}.rcs-v3{--cap:20px;--ring:18px}.rcs-v3 .rcs-head{grid-template-columns:88px minmax(0,1fr)}.rcs-v3 .rcs-face{width:88px;height:88px}}
 @media(min-width:601px) and (min-height:501px) and (max-height:800px){
 .rcs-v3{--ring:12px;padding:calc(var(--ring) + 14px)!important}
 .rcs-v3:has(.rcs-on:is([data-kind=recap],[data-kind=tricky])){padding:calc(var(--ring) + 8px)!important;gap:6px!important;--arrow:20px}
 .rcs-v3:has(.rcs-on:is([data-kind=recap],[data-kind=tricky])) .rcs-head{grid-template-columns:88px minmax(0,1fr);padding-right:calc(48px + var(--close-shift,0px))}
 .rcs-v3:has(.rcs-on:is([data-kind=recap],[data-kind=tricky])) .rcs-face{width:88px;height:88px}
 .rcs-v3:has(.rcs-on:is([data-kind=recap],[data-kind=tricky])) .rcs-text{font-size:34px!important;padding:8px 18px!important}
 .rcs-v3:has(.rcs-on:is([data-kind=recap],[data-kind=tricky])) .rcs-page{gap:6px}
 .rcs-v3:has(.rcs-on:is([data-kind=recap],[data-kind=tricky])) .rcs-side{gap:4px;padding-bottom:0}
 .rcs-v3:has(.rcs-on:is([data-kind=recap],[data-kind=tricky])) .rcs-dots{height:6px}
 .rcs-v3:has(.rcs-on:is([data-kind=recap],[data-kind=tricky])) .rcs-dot{width:6px;height:6px}
 .rcs-v3 .rcs-recap{row-gap:4px}.rcs-v3 .rcs-recap .rcs-flow{gap:12px}.rcs-v3 .rcs-recap .rcs-fig{gap:2px}
 }
 @media(max-width:600px){
 .rcs-v3{width:calc(100vw - 24px)!important;padding:calc(var(--ring) + 8px)!important;gap:12px!important;border-radius:18px!important;--cap:15px;--arrow:14px;--ring:10px}
 .rcs-v3 .rcs-page{gap:12px}.rcs-v3 .rcs-head{grid-template-columns:44px minmax(0,1fr);gap:8px;padding:0}
 .rcs-v3 .rcs-face{width:44px;height:44px}.rcs-v3 .rcs-copy{display:contents}.rcs-v3 .rcs-sign{margin:0!important;padding-right:calc(42px + var(--close-shift,0px))!important;font-size:15px!important}
 .rcs-v3 .rcs-text,.rcs-v3 .rcs-goal{grid-column:1/-1;font-size:22px!important;padding:8px!important;line-height:1.2!important}
 .rcs-v3 .rcs-flow{gap:8px}.rcs-v3 .rcs-rows{gap:12px}.rcs-v3 .rcs-fig{gap:4px}
 .rcs-v3 .rcs-number{width:19px;height:19px;margin-bottom:4px;font-size:14px}
 .rcs-v3 .rcs-flow:has(.rcs-number) .rcs-arrow{top:calc(var(--bin)*.45 + 23px)}
 .rcs-v3 .rcs-recap{gap:10px 8px}.rcs-v3 .rcs-recap .rcs-flow{position:relative;gap:3px 8px}
 .rcs-v3 .rcs-recap .rcs-cell,.rcs-v3 .rcs-recap .rcs-fig{display:contents}
 .rcs-v3 .rcs-recap .rcs-bay{grid-row:1}
 .rcs-v3 .rcs-recap .rcs-cap{grid-column:1/-1}
 .rcs-v3 .rcs-recap .rcs-correct .rcs-cap{color:#4b6738}
 .rcs-v3 .rcs-recap .rcs-arrow{right:calc(50% - 4px)}
 .rcs-v3 .rcs-wrong{gap:4px;margin-top:4px}.rcs-v3 .rcs-wrong-bay:after{height:3px}
 .rcs-v3 .rcs-side{gap:8px;padding-bottom:18px}.rcs-v3 .rcs-button{width:min(280px,100%)!important;min-width:0!important;min-height:48px!important;font-size:24px!important;padding:8px!important}
 .rcs-v3 .rcs-skip{position:static!important;min-height:32px!important;font-size:15px!important;padding:4px!important}
 .rcs-v3 .rcs-keys{font-size:13px;bottom:0;left:0}.rcs-v3 .rcs-close{right:calc(var(--ring) + 6px + var(--close-shift,0px))!important;top:calc(var(--ring) + 6px)!important}
 .rcs-v3 .rcs-criteria{gap:8px;padding:8px 0}.rcs-v3 .rcs-condition{gap:6px}.rcs-v3 .rcs-star{width:40px;height:40px}.rcs-v3 .rcs-condition p{font-size:16px}
 .rcs-v3 .rcs-stat{font-size:17px}.rcs-v3 .rcs-symbol{width:22px;height:22px}
 }
 @media(max-height:500px) and (min-width:601px){
 .rcs-v3{width:calc(100vw - 32px)!important;padding:calc(var(--ring) + 6px) calc(var(--ring) + 12px)!important;gap:8px!important;border-radius:18px!important;--cap:15px;--arrow:18px;--ring:10px}
 .rcs-v3 .rcs-close{right:calc(var(--ring) + 6px + var(--close-shift,0px))!important;top:calc(var(--ring) + 6px)!important}
 .rcs-v3 .rcs-page{gap:8px}.rcs-v3 .rcs-head{grid-template-columns:52px minmax(0,1fr);gap:10px;padding-right:calc(32px + var(--close-shift,0px))}
 .rcs-v3 .rcs-face{width:52px;height:52px}.rcs-v3 .rcs-sign{font-size:13px!important;margin-bottom:3px!important}
 .rcs-v3 .rcs-text,.rcs-v3 .rcs-goal{font-size:22px!important;padding:6px 10px!important;line-height:1.2!important}
 .rcs-v3 .rcs-flow{gap:18px}.rcs-v3 .rcs-rows{gap:6px}.rcs-v3 .rcs-fig{gap:3px}
 .rcs-v3 .rcs-number{width:18px;height:18px;margin-bottom:3px;font-size:13px}.rcs-v3 .rcs-flow:has(.rcs-number) .rcs-arrow{top:calc(var(--bin)*.45 + 21px)}
 .rcs-v3 .rcs-recap{gap:6px 18px}.rcs-v3 .rcs-recap .rcs-flow{gap:16px}
 .rcs-v3 .rcs-side{gap:6px;padding-bottom:16px}.rcs-v3 .rcs-button{min-height:48px!important;width:280px!important;font-size:24px!important;padding:6px!important}
 .rcs-v3 .rcs-skip{min-height:40px!important;width:auto!important;font-size:15px!important;bottom:18px!important}.rcs-v3 .rcs-keys{font-size:12px;bottom:0;left:0}
 .rcs-v3 .rcs-dots{height:10px}.rcs-v3 .rcs-dot{width:8px;height:8px}
 .rcs-v3 .rcs-criteria{gap:16px;padding:4px 0}.rcs-v3 .rcs-star{width:36px;height:36px}.rcs-v3 .rcs-condition{gap:4px}.rcs-v3 .rcs-condition p{font-size:16px}
 .rcs-v3 .rcs-stat{font-size:16px}.rcs-v3 .rcs-symbol{width:22px;height:22px}
 }
 `;
 // 하트 · 시계는 그림 칸 없이 점으로 그린다(셸 위 칸과 같은 표시).
 function pixelMark(n,slot,ratio){
  const r=n.getBoundingClientRect(),w=Math.round(r.width*ratio),h=Math.round(r.height*ratio);if(!w||!h)return;n.width=w;n.height=h;
  const g=n.getContext('2d'),dot=Math.max(1,Math.floor(Math.min(w,h)/14)),x=Math.round((w-14*dot)/2),y=Math.round((h-14*dot)/2);
  const rows=slot==='heart'?['00000000000000','00111000111000','01111101111100','11111111111110','11111111111110','11111111111110','01111111111100','00111111111000','00011111110000','00001111100000','00000111000000','00000010000000']:['00001111110000','00111111111100','01110000001110','01100010000110','11000010000011','11000010000011','11000011110011','11000000000011','01100000000110','01110000001110','00111111111100','00001111110000'];
  g.fillStyle=slot==='heart'?'#a53c3a':'#3c5348';rows.forEach((row,yy)=>[...row].forEach((p,xx)=>{if(p==='1')g.fillRect(x+xx*dot,y+yy*dot,dot,dot);}));n.__grid={dot,x,y};
 }
 function stageWindow(host,c){
  const doc=host.ownerDocument,win=doc.defaultView,R=family.rules,S=family.scene,stage=c.stage;
  if(!doc.getElementById('rc-start-v3')){const style=doc.createElement('style');style.id='rc-start-v3';style.textContent=css3;doc.head.append(style);}
  const pages=R.lessonPages(c.data.content,c.data.game,stage.id),last=pages.length-1;
  const start=host.querySelector('[data-test=stage-start]'),close=host.querySelector('[data-test=stage-close]'),name=host.querySelector('h3'),label=host.getAttribute('aria-label'),title=name.textContent;
  const node=(tag,cls,text,parent)=>{const n=doc.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;parent?.append(n);return n;};
  const pics=[],marks=[],bank=new Map(),asset=slot=>c.data.art.slots[slot];
  const pic=(parent,slot,frame,cls,crop)=>{const n=node('canvas',cls,undefined,parent);n.width=1;n.height=1;n.setAttribute('aria-hidden','true');n.dataset.slot=slot;n.dataset.frame=String(frame);pics.push({n,crop});return n;};
  const binIndex=id=>R.BINS.indexOf(id),binName=id=>c.data.content.bins[binIndex(id)].name;
  host.replaceChildren();host.classList.add('rcs-v3');host.dataset.startPlay='stage';host.dataset.input='pointer';
  // 카드 틀: 도감과 같은 초록 철판 테두리(--ring) 안에 크림 판. 그림이 오기 전에는 CSS 크림 판이 대신한다.
  const frame=node('canvas','rcs-frame',undefined,host);frame.setAttribute('aria-hidden','true');
  const deck=node('div','rcs-pages',undefined,host);deck.setAttribute('aria-live','polite');
  function rule(parent,text,cls){
   const p=node('p',cls,undefined,parent),names=[...c.data.content.bins].sort((a,b)=>b.name.length-a.name.length);
   const re=new RegExp('('+names.map(b=>b.name).join('|')+')','g');
   for(const part of text.split(re)){const b=names.find(b=>b.name===part),n=node('span','',part,p);if(b){n.style.color=BIN_INK[b.id];n.dataset.binInk=b.id;}}
  }
  function heading(v,p){
   const head=node('header','rcs-head',undefined,v);
   pic(head,'v3-worker-half',0,'rcs-face',[100,56,150,150]);
   const copy=node('div','rcs-copy',undefined,head),h=node('h3','rcs-sign',title,copy);
   if(v===deck.children[0])h.id='rcs-stage-title';
   rule(copy,p.kind==='ready'?stage.goal.text:p.text,p.kind==='ready'?'rcs-goal':'rcs-text');
  }
  function flow(parent,count){const row=node('div','rcs-flow',undefined,parent);row.style.setProperty('--cols',String(count));return row;}
  function figure(row,slot,frame,caption,{bin=false,number}={}){
   const cell=node('div','rcs-cell',undefined,row);
   if(number)node('span','rcs-number',String(number),cell);
   const fig=node('figure','rcs-fig'+(bin?' rcs-correct':''),undefined,cell),bay=node('div','rcs-bay',undefined,fig);
   pic(bay,slot,frame,'rcs-object',bin?[5,40,94,132]:undefined);
   node('figcaption','rcs-cap',caption,fig);return cell;
  }
  function arrow(cell){
   const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('rcs-arrow');svg.setAttribute('viewBox','0 0 40 40');svg.setAttribute('aria-hidden','true');
   const path=doc.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M3 13H23V5L37 20 23 35V27H3Z');path.setAttribute('fill','currentColor');svg.append(path);cell.append(svg);
  }
  const itemFig=(row,x,options={})=>figure(row,'v3-items',x.frame,x.item.name,options);
  const binFig=(row,id,options={})=>figure(row,'v3-bins',binIndex(id)*4,binName(id),{...options,bin:true});
  function wrong(parent,id){
   const f=node('figure','rcs-wrong',undefined,parent),bay=node('span','rcs-wrong-bay',undefined,f);
   pic(bay,'v3-bins',binIndex(id)*4,'rcs-object',[5,40,94,132]);node('figcaption','rcs-cap',binName(id)+' 통 아니에요',f);
  }
  function lesson(v,p){
   const rows=node('div','rcs-rows',undefined,v);
   if(p.kind==='bin'){const r=flow(rows,p.items.length+1);for(const x of p.items)itemFig(r,x);arrow(r.children[p.items.length-1]);binFig(r,p.bin);}
   if(p.kind==='prep')for(const x of p.items){
    const r=flow(rows,x.frames.length+1);
    x.frames.forEach((frame,i)=>{const cell=figure(r,'v3-items',frame,i?x.steps[i-1]:x.item.name,{number:i+1});arrow(cell);});
    binFig(r,x.bin,{number:x.frames.length+1});
   }
   if(p.kind==='tricky'){
    const groups=new Map();for(const w of p.wrong){const k=w.like+'>'+w.to;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(w);}
    for(const list of groups.values()){const group=node('div','rcs-group',undefined,rows),r=flow(group,list.length+1);for(const x of list)itemFig(r,x);arrow(r.children[list.length-1]);binFig(r,list[0].to);wrong(group,list[0].like);}
    for(const bin of [...new Set(p.right.map(x=>x.item.bin))]){const items=p.right.filter(x=>x.item.bin===bin),r=flow(rows,items.length+1);for(const x of items)itemFig(r,x);arrow(r.children[items.length-1]);binFig(r,bin);}
   }
   if(p.kind==='recap'){rows.classList.add('rcs-recap');for(const b of p.bins){const r=flow(rows,2);arrow(itemFig(r,b));binFig(r,b.bin);}}
  }
  function ready(v){
   const m=model({...c,stage},'stage'),criteria=node('div','rcs-criteria',undefined,v);criteria.setAttribute('aria-label','이 단계에서 모은 별 '+c.stars+' / 3');
   for(const [i,text]of c.criteria.entries()){const cell=node('div','rcs-condition',undefined,criteria),star=pic(cell,'v3-end-star',i<c.stars?0:1,'rcs-star');star.dataset.earned=String(i<c.stars);node('p','',text,cell);}
   const stats=node('div','rcs-stats',undefined,v);
   for(const [slot,text]of [['heart','하트 '+m.hearts+'개'],...(m.seconds?[['clock',m.seconds+'초']]:[])]){const stat=node('span','rcs-stat',undefined,stats),mark=node('canvas','rcs-symbol',undefined,stat);mark.dataset.slot=slot;mark.setAttribute('aria-hidden','true');marks.push(mark);node('span','',text,stat);}
  }
  const views=pages.map(p=>{const v=node('section','rcs-page',undefined,deck);v.dataset.kind=p.kind;heading(v,p);if(p.kind==='ready')ready(v);else lesson(v,p);return v;});
  const side=node('footer','rcs-side',undefined,host),dots=node('div','rcs-dots',undefined,side);dots.setAttribute('aria-hidden','true');
  const dotList=pages.map(()=>node('span','rcs-dot',undefined,dots));
  const keys=node('p','rcs-keys',R.CARD_TEXT.keys,side);keys.hidden=!keyboardInput;host.dataset.input=keyboardInput?'keyboard':'pointer';
  const nav=node('div','rcs-nav',undefined,side);
  const skip=node('button','rcs-button rcs-skip',R.CARD_TEXT.skip,nav);skip.type='button';skip.dataset.test='lesson-skip';
  const next=node('button','rcs-button rcs-big',R.CARD_TEXT.next,nav);next.type='button';next.dataset.test='lesson-next';
  start.className='rcs-button rcs-big';nav.append(start);
  if(close){close.className='gf-stage-close rcs-close';close.textContent='×';close.setAttribute('aria-label','닫기');host.append(close);}
  if(label)host.setAttribute('aria-label',label);
  let at=0;
  function input(kind){host.dataset.input=kind;keys.hidden=kind!=='keyboard';}
  const pointer=()=>input('pointer');
  win.addEventListener('pointerdown',pointer,true);
  function go(i){
   at=Math.max(0,Math.min(last,i));const isReady=at===last;
   views.forEach((v,j)=>{const on=j===at;v.classList.toggle('rcs-on',on);v.setAttribute('aria-hidden',String(!on));v.inert=!on;});
   host.dataset.page=pages[at].kind;host.dataset.pageIndex=String(at);
   dotList.forEach((d,j)=>d.dataset.frame=String(j===at?0:1));
   skip.hidden=!(at===0&&!isReady&&c.stars>0);next.hidden=isReady;start.hidden=!isReady;
   const active=doc.activeElement;
   if(isReady){if(!host.contains(active)||active===next||active===skip)start.focus({preventScroll:true});}
   else if(!host.contains(active)||active===start||active===skip&&skip.hidden)next.focus({preventScroll:true});
   layout();paint();
  }
  next.onclick=()=>go(at+1);skip.onclick=()=>go(last);
  function key(e){
   if(!host.isConnected){cleanup();return;}
   if(e.altKey||e.ctrlKey||e.metaKey)return;input('keyboard');
   const active=doc.activeElement,onButton=active?.tagName==='BUTTON'&&host.contains(active),stop=()=>{e.preventDefault();e.stopImmediatePropagation();};
   if(e.key==='ArrowLeft'&&at>0){stop();go(at-1);return;}
   if(at===last)return;
   if(e.key==='ArrowRight'||(e.key==='Enter'||e.key===' ')&&!onButton){stop();go(at+1);return;}
   if(e.key==='Tab'){stop();const list=[skip,next,close].filter(b=>b&&!b.hidden),i=list.indexOf(active);list[(i+(e.shiftKey?-1:1)+list.length)%list.length].focus();}
  }
  win.addEventListener('keydown',key,true);
  function image(slot){const a=asset(slot);if(!a)return null;if(!bank.has(slot)){const img=c.images?.[slot]||new win.Image();if(!img.src)img.src=new URL(a.file,c.base).href;bank.set(slot,img);if(!img.complete)img.addEventListener('load',paint,{once:true});}return bank.get(slot);}
  // 글자와 단추는 줄이지 않는다. 현재 장의 가로 칸과 남은 높이에 그림만 맞춘다.
  function layout(){
   const w=win.innerWidth,h=win.innerHeight,tall=w<=600,low=h<=500&&!tall,v=views[at];
   host.dataset.mode=tall?'tall':low?'low':'wide';
   // 큰 카드에서도 바깥 소리 단추가 닫기를 가리지 않게 한다.
   host.style.setProperty('--close-shift','0px');
   let size=tall?64:low?68:160;
   const min=tall?18:low?18:60;
   for(let pass=0;pass<4;pass++){
    host.style.setProperty('--item',size+'px');host.style.setProperty('--bin',Math.ceil(size*1.22)+'px');
    const bays=[...v.querySelectorAll('.rcs-bay')],limit=Math.min(...bays.map(b=>b.clientWidth||Infinity));
    const r=host.getBoundingClientRect(),over=Math.max(0,r.height-(h-24));
    if(size<=limit&&over<1)break;
    const rowCount=pages[at].kind==='recap'?Math.ceil(pages[at].bins.length/3):(v.querySelectorAll('.rcs-flow').length||1);
    size=Math.max(min,Math.floor(Math.min(limit-2,size-over/(rowCount*1.22)-2)));
   }
   if(close&&win.frameElement){
    const sound=win.parent.document.querySelector('[data-test=sound]'),box=win.frameElement?.getBoundingClientRect();
    if(sound&&box){const s=sound.getBoundingClientRect(),r=close.getBoundingClientRect();if(r.top+box.top<s.bottom+8&&r.bottom+box.top>s.top&&r.right+box.left>s.left-8)host.style.setProperty('--close-shift',Math.ceil(r.right+box.left-s.left+8)+'px');}
   }
  }
  let cleanPlate,bolt;
  function frameParts(pi,pa){
   if(cleanPlate)return;
   cleanPlate=doc.createElement('canvas');cleanPlate.width=pa.w;cleanPlate.height=pa.h;const p=cleanPlate.getContext('2d');p.drawImage(pi,0,0);
   // 원래 작은 못은 같은 철판의 빈 곳으로 메우고, 떼어 둔 못만 띠 가운데 그린다.
   for(const x of [20,672])for(const [y,sy]of [[42,88],[332,280]])p.drawImage(pi,x,sy,30,34,x,y,30,34);
   bolt=doc.createElement('canvas');bolt.width=26;bolt.height=30;const b=bolt.getContext('2d');
   b.beginPath();b.moveTo(8,1);for(const [x,y]of [[18,1],[25,8],[25,23],[19,29],[7,29],[1,23],[1,8]])b.lineTo(x,y);b.closePath();b.clip();b.drawImage(pi,22,44,26,30,0,0,26,30);
  }
  function paint(){
   if(!host.isConnected)return;const ratio=win.devicePixelRatio||1;
   {const fw=host.offsetWidth||0,fh=host.offsetHeight||0,ring=parseFloat(win.getComputedStyle?.(host).getPropertyValue('--ring'))||0,pa=asset('v3-card-plate'),pi=image('v3-card-plate'),ca=asset('v3-card-cream'),ci=image('v3-card-cream');
    if(fw&&fh&&ring&&pa&&ca&&pi?.complete&&pi.naturalWidth&&ci?.complete&&ci.naturalWidth){
     frame.width=Math.round(fw*ratio);frame.height=Math.round(fh*ratio);const g=frame.getContext('2d');g.setTransform(ratio,0,0,ratio,0,0);g.clearRect(0,0,fw,fh);
     frameParts(pi,pa);
     S.drawNine(g,cleanPlate,pa,0,[80,80,80,80],0,0,fw,fh,ring/46,ratio);
     S.drawNine(g,ci,ca,0,[24,24,24,24],ring,ring,fw-2*ring,fh-2*ring,Math.min(.6,ring/36),ratio);
     const bw=Math.round(Math.max(8,ring*.65)*ratio)/ratio,bh=bw*30/26;
     for(const x of [ring*.55,fw-ring*.55])for(const y of [ring*1.6,fh-ring*1.6])g.drawImage(bolt,Math.round((x-bw/2)*ratio)/ratio,Math.round((y-bh/2)*ratio)/ratio,bw,bh);
     host.dataset.framed='';
    }}
   for(const {n,crop}of pics){
    const r=n.getBoundingClientRect(),slot=n.dataset.slot,a=asset(slot),im=image(slot);
    if(!r.width||!r.height||!a||!im?.complete||!im.naturalWidth)continue;
    n.width=Math.max(1,Math.round(r.width*ratio));n.height=Math.max(1,Math.round(r.height*ratio));const g=n.getContext('2d');g.setTransform(ratio,0,0,ratio,0,0);g.clearRect(0,0,r.width,r.height);
    const src=crop||[0,0,a.w,a.h],scale=Math.min(r.width/src[2],r.height/src[3]),q=slot==='v3-items'?S.sharp(im,a,image('v3-items-hd'),asset('v3-items-hd'),scale,ratio):{img:im,a,scale};
    const source=slot==='v3-items'?undefined:src;
    S.drawArt(g,q.img,q.a,Number(n.dataset.frame),(r.width-src[2]*scale)/2,(r.height-src[3]*scale)/2,q.scale,ratio,source);
   }
   for(const n of marks)pixelMark(n,n.dataset.slot,ratio);
  }
  const refit=()=>{layout();paint();},resize=new win.ResizeObserver(refit);resize.observe(host);
  win.addEventListener('resize',refit);
  function cleanup(){resize.disconnect();gone.disconnect();win.removeEventListener('resize',refit);win.removeEventListener('keydown',key,true);win.removeEventListener('pointerdown',pointer,true);}
  const gone=new win.MutationObserver(()=>{if(!host.isConnected)cleanup();});gone.observe(doc.body,{childList:true,subtree:true});
  doc.fonts?.ready?.then(()=>{if(host.isConnected)refit();});
  go(0);return{go,page:()=>at,pages};
 }
 function model(c,play){
  const R=family.rules,g=c.data.game,stage=c.stage;
  const F=R.focusOf(stage),bins=stage?(F.length?F:stage.bins):play==='stage'?g.modeKit.stage.stages[0].bins:R.openBins({game:g,play:'endless',t:0});
  const eligible=F.length?c.data.content.items.filter(i=>F.includes(i.bin)&&(!i.tricky||stage.tricky>0)):[];
  const items=eligible.slice(0,4);
  return{bins,items,hearts:stage?.hearts??g.modeKit.endless.hearts,seconds:stage?.timeSec??null};
 }
 // The menu owns only this screen. The lesson, map and play presentations keep
 // their existing artwork and layout. Geometry is independent of FLIP transforms.
 function menuWindow(host,c){
  const doc=host.ownerDocument,win=doc.defaultView,S=family.scene,bank=new Map(),pictures=[];
  const node=(tag,cls,parent,text)=>{const n=doc.createElement(tag);n.className=cls;if(text!==undefined)n.textContent=text;parent?.append(n);return n;};
  const style=node('style','',doc.head);style.textContent=`
   .rcm-menu{font-family:Jua,sans-serif!important;color:#3e392a!important}
   .rcm-menu *{box-sizing:border-box}.rcm-menu .gf-menu{padding:0!important;overflow:hidden!important;display:block!important}
   .rcm-menu .gf-menu-veil,.rcm-menu .gf-ui-background{display:none!important}
   .rcm-floor{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none}
   .rcm-menu .gf-menu-top{position:static!important;min-height:0!important}
   .rcm-menu .gf-menu-sign{position:absolute!important;left:50%!important;top:var(--sign-y)!important;width:var(--sign-w)!important;height:var(--sign-h)!important;transform:translateX(-50%)!important;margin:0!important}
   .rcm-menu .gf-menu-sign img{width:100%!important;height:100%!important;object-fit:contain;filter:drop-shadow(0 4px 2px #382b2933)}
   .rcm-menu .gf-menu-sign h1{font-size:var(--title)!important;padding:0 12px 5px!important;color:#4a3626!important}
   .rcm-menu .gf-menu-side{position:static!important;padding:0!important}.rcm-menu .gf-menu-slot{display:none!important}
   .rcm-menu .gf-music{position:absolute!important;top:var(--corner-y)!important;right:calc(var(--corner-x) + var(--corner) + 10px)!important;width:var(--corner)!important;height:var(--corner)!important;min-height:44px!important;min-width:44px!important;padding:0!important;border:0!important;border-radius:50%!important;background:var(--round) center/100% 100% no-repeat!important;box-shadow:0 3px 3px #392d2940!important;color:#675038!important;opacity:1!important}
   .rcm-menu .gf-music svg{width:42%!important;height:42%!important}.rcm-menu .gf-music:after{height:2px!important;background:#a55236!important}
   .rcm-menu .gf-menu-tag{position:absolute!important;left:50%;top:var(--tag-y);transform:translateX(-50%);height:var(--tag-h);max-width:calc(100% - 24px);width:max-content;margin:0!important;padding:4px 18px!important;gap:10px!important;border:2px solid #8a714d;background:#fff4d8!important;color:#55412d!important;box-shadow:0 3px 0 #d0b98b;font-size:var(--tag-font)!important;line-height:1.25!important;white-space:nowrap}
   .rcm-menu .gf-menu-subj{display:inline-block!important;padding:0 10px 0 0!important;border:0!important;border-right:1px solid #baa47b!important;border-radius:0!important;background:none!important;color:#5d7746!important;font-size:inherit!important}
   .rcm-menu .gf-menu-mid,.rcm-menu .gf-deck,.rcm-menu .gf-deck-row{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;padding:0!important;margin:0!important;display:block!important;pointer-events:none}
   .rcm-menu .gf-deck-card,.rcm-menu .gf-deck-arrow{pointer-events:auto}
   .rcm-menu .gf-deck-card{--unit:var(--scale);position:absolute!important;left:var(--card-x)!important;top:var(--card-y)!important;width:var(--card-w)!important;height:var(--card-h)!important;max-height:none!important;display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-template-rows:max(40px,calc(56px*var(--unit))) minmax(0,1fr) auto auto max(48px,calc(68px*var(--unit)))!important;gap:max(6px,calc(10px*var(--unit)))!important;padding:max(16px,calc(26px*var(--unit)))!important;margin:0!important;border:0!important;border-radius:14px!important;background:#fff2d3!important;box-shadow:0 8px 12px #463c3c45!important;text-align:center!important;color:#4a3626!important;overflow:visible!important;isolation:isolate;cursor:pointer}
   .rcm-menu .gf-deck-card:not([data-spot=main]){--unit:calc(var(--scale)*.6);left:var(--back-x)!important;top:var(--back-y)!important;width:var(--back-w)!important;height:var(--back-h)!important;rotate:4deg;filter:brightness(.84) saturate(.85);z-index:1!important;grid-template-rows:max(32px,calc(56px*var(--unit))) minmax(0,1fr) auto auto max(32px,calc(68px*var(--unit)))!important;padding:max(12px,calc(26px*var(--unit)))!important;gap:5px!important}
   .rcm-menu .gf-deck-card[data-spot=main]{z-index:2!important}
   .rcm-skin{position:absolute;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none}
   .rcm-menu .gf-deck-name{position:relative;display:grid!important;place-items:center;justify-self:center;width:65%;height:100%;min-height:0!important;margin:0!important;padding:0!important;color:#fff8df!important;background:#416346;font-size:max(22px,calc(36px*var(--unit)))!important;line-height:1.1!important;white-space:nowrap;isolation:isolate}
   .rcm-menu .gf-deck-card:not([data-spot=main]) .gf-deck-name{font-size:max(16px,calc(36px*var(--unit)))!important}
   .rcm-scene{display:block;width:100%;height:100%;min-height:0;align-self:stretch}
   .rcm-copy{display:grid;gap:5px;min-width:0}.rcm-menu .gf-deck-desc{display:grid!important;place-items:center;min-height:max(30px,calc(40px*var(--unit)));margin:0!important;padding:3px 10px!important;border:1px solid #c6ae78;border-radius:8px;background:#fff5db;color:#574630!important;font-size:max(14px,calc(23px*var(--unit)))!important;line-height:1.2!important;white-space:nowrap}
   .rcm-lock{display:flex;align-items:center;justify-content:center;gap:8px;min-height:max(32px,calc(40px*var(--unit)));padding:3px 8px;border:2px solid #a48b62;border-radius:7px;background:#e8dac0;font-size:max(12px,calc(19px*var(--unit)));line-height:1.2;word-break:keep-all}.rcm-lock svg{width:20px;height:24px;flex:none;fill:#715d3e}
   .rcm-stats{display:flex;justify-content:center;gap:max(8px,calc(20px*var(--unit)));min-width:0}.rcm-stat,.rcm-menu .gf-deck-rec{display:flex!important;align-items:center;justify-content:center;gap:8px;min-width:0;min-height:max(32px,calc(48px*var(--unit)));padding:4px max(8px,calc(22px*var(--unit)))!important;border:2px solid #aa8b59!important;border-radius:9px!important;background:#fff4d8!important;color:#55412d!important;font: max(14px,calc(23px*var(--unit)))/1.1 Jua,sans-serif!important;white-space:nowrap}
   .rcm-stat canvas,.rcm-menu .gf-deck-rec svg{width:max(18px,calc(28px*var(--unit)))!important;height:max(18px,calc(28px*var(--unit)))!important;flex:none}.rcm-menu .gf-deck-rec svg{color:#d69d35}
   .rcm-menu .gf-deck-go{position:relative;display:grid!important;place-items:center;justify-self:center;width:52%!important;min-width:0!important;min-height:44px!important;height:100%!important;padding:0!important;margin:0!important;border:0!important;border-radius:8px!important;background:#486c3d!important;box-shadow:none!important;color:#fff8df!important;font: max(24px,calc(32px*var(--unit)))/1 Jua,sans-serif!important;text-shadow:0 2px #35512d;animation:none!important;isolation:isolate}
   .rcm-menu .gf-deck-go[hidden]{display:grid!important}.rcm-menu .gf-deck-go svg,.rcm-menu .gf-deck-go .gf-kbd{display:none!important}.rcm-menu [aria-disabled=true] .gf-deck-go{filter:saturate(.45) brightness(1.3);opacity:.65}.rcm-menu :is(.gf-deck-name,.gf-deck-go):has(canvas[data-painted=true]){background:transparent!important}
   .rcm-menu .gf-deck-arrow{position:absolute!important;top:var(--arrow-y)!important;width:var(--arrow)!important;height:var(--arrow)!important;min-width:44px!important;min-height:44px!important;padding:0!important;margin:0!important;border:0!important;border-radius:50%!important;background-color:transparent!important;background-position:center!important;background-size:100% 100%!important;box-shadow:0 4px 4px #372e2c44!important}
   .rcm-menu .gf-deck-arrow-l{left:var(--prev-x)!important;background-image:var(--left)!important}.rcm-menu .gf-deck-arrow-r{left:var(--next-x)!important;background-image:var(--right)!important}.rcm-menu .gf-deck-arrow svg{display:none!important}
   .rcm-menu .gf-deck-dots{position:absolute!important;left:var(--dots-x)!important;top:var(--dots-y)!important;width:52px!important;height:44px!important;margin:0!important;display:flex!important;align-items:center;justify-content:center;gap:12px!important;transform:translateX(-50%)}
   .rcm-menu .gf-deck-dots i{width:15px!important;height:15px!important;border:2px solid #fff5db!important;border-radius:50%!important;background:#b6a88d!important;box-shadow:0 1px 2px #6b5836}.rcm-menu .gf-deck-dots i.on{background:#42683b!important}
   .rcm-menu .gf-menu-keys{position:absolute!important;right:12px;bottom:4px;min-height:24px;margin:0!important;padding:3px 10px!important;border-radius:20px;background:#fff4d8;color:#55412d;font:14px/1.2 Jua,sans-serif!important;visibility:hidden!important;display:block!important;pointer-events:none}.rcm-menu .gf-menu-keys .gf-kbd{display:inline!important;padding:0 3px!important;border:0!important;background:none!important;box-shadow:none!important;color:inherit!important;font:inherit!important}
   .rcm-menu button:focus{outline:none!important}.rcm-menu[data-input=keyboard] button:focus{outline:3px solid #aa6b18!important;outline-offset:4px!important}.rcm-menu[data-input=keyboard] .gf-menu-keys{visibility:visible!important}
   .rcm-menu .gf-rotate{display:none!important}
   @media(max-width:600px) and (min-height:451px){.rcm-menu .gf-menu-keys{left:50%;right:auto;bottom:2px;transform:translateX(-50%);white-space:nowrap;font-size:12px!important}.rcm-menu .gf-deck-go{width:78%!important}.rcm-menu .gf-deck-name{width:80%}.rcm-menu .rcm-stat,.rcm-menu .gf-deck-rec{padding:4px 8px!important;font-size:16px!important;gap:5px}.rcm-menu .gf-deck-card:not([data-spot=main]){rotate:2deg}.rcm-menu .gf-menu-tag{gap:5px!important;padding:3px 8px!important}.rcm-menu .gf-menu-subj{padding-right:5px!important}}
   @media(max-height:450px) and (min-width:601px){.rcm-menu .gf-deck-card{grid-template-columns:47% minmax(0,1fr)!important;grid-template-rows:26px minmax(0,1fr) 24px 44px!important;gap:3px 12px!important;padding:10px 16px!important}.rcm-menu .rcm-scene{grid-column:1;grid-row:1/5}.rcm-menu .gf-deck-name{grid-column:2;width:80%;font-size:22px!important}.rcm-menu .rcm-copy,.rcm-menu .rcm-stats,.rcm-menu .gf-deck-go{grid-column:2}.rcm-menu .gf-deck-desc{min-height:18px;font-size:14px!important;padding:2px!important;border:0;background:none!important}.rcm-lock{min-height:24px;font-size:12px;padding:2px 4px;gap:4px}.rcm-lock svg{height:16px;width:13px}.rcm-copy{gap:2px}.rcm-menu .rcm-stat,.rcm-menu .gf-deck-rec{min-height:24px!important;padding:2px 6px!important;font-size:14px!important;gap:4px;border-width:1px!important}.rcm-stats{gap:8px}.rcm-stat canvas,.rcm-menu .gf-deck-rec svg{width:18px!important;height:18px!important}.rcm-menu .gf-deck-go{width:80%!important;font-size:22px!important}.rcm-menu .gf-deck-card:not([data-spot=main]){display:none!important}}
  `;
  host.classList.add('rcm-menu');host.dataset.input=keyboardInput?'keyboard':'pointer';
  const asset=slot=>c.data.art.slots[slot.startsWith('menu-')?'v3-'+slot:slot],url=slot=>new URL(asset(slot).file,c.base).href;
  const floor=node('img','rcm-floor');floor.alt='';host.prepend(floor);
  const sign=host.querySelector('.gf-menu-sign img');if(sign)sign.src=url('menu-sign');
  host.style.setProperty('--left',`url("${url('menu-arrow-left')}")`);host.style.setProperty('--right',`url("${url('menu-arrow-right')}")`);host.style.setProperty('--round',`url("${url('menu-round-cream')}")`);
  function pic(parent,slot,cls,nine){const n=node('canvas',cls,parent);n.dataset.slot=slot;n.setAttribute('aria-hidden','true');pictures.push({n,slot,nine});return n;}
  const lockSVG='<svg viewBox="0 0 24 28" aria-hidden="true"><path d="M6 12V7a6 6 0 0 1 12 0v5h3v13H3V12zm3 0h6V7a3 3 0 0 0-6 0zm2 5v5h2v-5z"/></svg>';
  for(const card of host.querySelectorAll('.gf-deck-card')){
   const play=card.dataset.play,name=card.querySelector('.gf-deck-name'),desc=card.querySelector('.gf-deck-desc'),rec=card.querySelector('.gf-deck-rec'),go=card.querySelector('.gf-deck-go'),locked=card.getAttribute('aria-disabled')==='true',reason=desc.textContent;
   card.replaceChildren();pic(card,'v3-card-plate','rcm-skin','frame');card.append(name);pic(name,'v3-card-title','rcm-skin',[30,20,30,20]);
   pic(card,play==='stage'?'menu-stage':'menu-endless','rcm-scene');
   const copy=node('span','rcm-copy',card);desc.textContent=play==='stage'?'종류마다 한 단계씩 배워요':'모든 종류가 섞여 나와요';copy.append(desc);
   if(locked){const lock=node('span','rcm-lock',copy);lock.innerHTML=lockSVG;node('span','',lock,reason);}
   const stats=node('span','rcm-stats',card),heart=node('span','rcm-stat',stats);pic(heart,'heart','rcm-heart');node('span','',heart,`하트 ${c.data.game.modeKit.endless.hearts}개`);
   if(locked){rec.innerHTML=window.GFModesUI.glyph('trophy');node('span','',rec,`내 최고 ${c.store.best(c.grade,play).toLocaleString('ko-KR')}점`);}stats.append(rec);
   go.hidden=false;card.append(go);pic(go,'v3-button-big','rcm-skin',[30,24,30,24]);
  }
  let disposed=false,parentStyle,parentDoc,cleanPlate,bolt,afterFrame;
  if(win.parent!==win){parentDoc=win.parent.document;parentStyle=node('style','',parentDoc.head);parentStyle.textContent=`
   body[data-ui-family=recycle][data-ui-menu] :is(.exit-button,.sound-button){top:var(--rc-corner-y)!important;width:var(--rc-corner)!important;height:var(--rc-corner)!important;min-width:44px!important;min-height:44px!important;border:0!important;background:var(--rc-round) center/100% 100% no-repeat!important;box-shadow:0 3px 3px #392d2940!important;color:#675038!important;border-radius:50%!important}
   body[data-ui-family=recycle][data-ui-menu] .exit-button{left:var(--rc-corner-x)!important}
   body[data-ui-family=recycle][data-ui-menu] .sound-button{right:var(--rc-corner-x)!important}
   body[data-ui-family=recycle][data-ui-menu] .exit-button:before{content:'◀'!important;font-size:calc(var(--rc-corner)*.34)!important}
   body[data-ui-family=recycle][data-ui-menu] :is(.exit-button,.sound-button):focus{outline:none!important}
   body[data-ui-family=recycle][data-ui-menu][data-rc-input=keyboard] :is(.exit-button,.sound-button):focus{outline:3px solid #aa6b18!important;outline-offset:3px!important}
  `;parentDoc.body.style.setProperty('--rc-round',`url("${url('menu-round-cream')}")`);}
  function layout(){
   const W=win.innerWidth,H=win.innerHeight,phone=W<=600&&H>450,low=H<=450&&W>600;
   const corner=phone?48:low?44:Math.min(80,Math.max(48,H*.087)),cx=phone?10:low?10:24,cy=phone?8:low?6:18;
   const signW=phone?Math.min(288,W-90):low?Math.min(300,W-280):Math.min(630,W*.47),signH=phone?76:low?(H<320?38:52):Math.min(100,H*.112),signY=phone?62:low?4:14;
   const tagY=signY+signH+6,tagH=phone?30:low?22:36,cardY=tagY+tagH+(phone?14:low?8:16);
   const cw=phone?W-60:low?Math.min(650,W-148):Math.min(900,W*.64),ch=phone?H-cardY-96:low?H-cardY-46:Math.min(670,H-cardY-56),scale=phone?.72:low?.55:Math.min(1,ch/670);
   const arrow=phone?48:low?44:Math.min(100,Math.max(60,cw*.112)),x=phone?8:low?(W-cw)/2:Math.max(arrow+20,(W-cw)/2-cw*.18);
   const bw=cw*.6,bh=ch*.7,bx=Math.min(x+cw*.87,W-bw-(phone?7:18)),by=cardY+ch*.16;
   const vars={'card-x':x,'card-y':cardY,'card-w':cw,'card-h':ch,'back-x':bx,'back-y':by,'back-w':bw,'back-h':bh,'sign-y':signY,'sign-w':signW,'sign-h':signH,'title':phone?28:low?26:44,'tag-y':tagY,'tag-h':tagH,'tag-font':phone?12:low?13:19,'corner':corner,'corner-x':cx,'corner-y':cy,'arrow':arrow,'arrow-y':phone?H-74:cardY+(ch-arrow)/2,'prev-x':phone?24:Math.max(10,x-arrow-20),'next-x':phone?W-72:W-arrow-18,'dots-x':x+cw/2,'dots-y':phone?H-72:low?H-44:cardY+ch+4};
   for(const [k,v]of Object.entries(vars))host.style.setProperty('--'+k,v+'px');host.style.setProperty('--scale',scale);
   if(parentDoc)for(const [k,v]of Object.entries({corner,'corner-x':cx,'corner-y':cy}))parentDoc.body.style.setProperty('--rc-'+k,v+'px');
   const next=url(phone?'menu-floor-tall':'menu-floor-wide');if(floor.src!==next)floor.src=next;
   host.dataset.layout=phone?'tall':low?'low':'wide';
  }
  function image(slot){if(slot==='heart')return null;if(!bank.has(slot)){const im=new win.Image();bank.set(slot,im);im.onload=()=>{paint();if([...bank.values()].every(x=>x.complete&&x.naturalWidth))host.dataset.menuReady='true';};im.src=url(slot);}return bank.get(slot);}
  function frameParts(im,a){if(cleanPlate)return;cleanPlate=doc.createElement('canvas');cleanPlate.width=a.w;cleanPlate.height=a.h;const g=cleanPlate.getContext('2d');g.drawImage(im,0,0);for(const x of [20,672])for(const [y,sy]of [[42,88],[332,280]])g.drawImage(im,x,sy,30,34,x,y,30,34);bolt=doc.createElement('canvas');bolt.width=26;bolt.height=30;const b=bolt.getContext('2d');b.beginPath();b.moveTo(8,1);for(const [x,y]of [[18,1],[25,8],[25,23],[19,29],[7,29],[1,23],[1,8]])b.lineTo(x,y);b.closePath();b.clip();b.drawImage(im,22,44,26,30,0,0,26,30);}
  function paint(){
   if(disposed||!host.isConnected)return;const dpr=win.devicePixelRatio||1;
   for(const {n,slot:baseSlot,nine}of pictures){
    const slot=host.dataset.layout==='tall'&&['menu-stage','menu-endless'].includes(baseSlot)?baseSlot+'-tall':baseSlot;n.dataset.slot=slot;
    const w=n.offsetWidth,h=n.offsetHeight;if(!w||!h)continue;
    if(slot==='heart'){pixelMark(n,'heart',dpr);continue;}
    const a=asset(slot),im=image(slot);if(!im?.complete||!im.naturalWidth)continue;
    n.width=Math.round(w*dpr);n.height=Math.round(h*dpr);const g=n.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
    if(nine==='frame'){
     const cream=image('v3-card-cream'),ca=asset('v3-card-cream');if(!cream?.complete||!cream.naturalWidth)continue;
     const ring=Math.max(10,Math.min(22,w*.026));frameParts(im,a);S.drawNine(g,cleanPlate,a,0,[80,80,80,80],0,0,w,h,ring/46,dpr);S.drawNine(g,cream,ca,0,[24,24,24,24],ring,ring,w-ring*2,h-ring*2,.5,dpr);
     const b=ring*.72;for(const x of [ring*.52,w-ring*.52])for(const y of [ring*1.35,h-ring*1.35])g.drawImage(bolt,x-b/2,y-b/2,b,b*30/26);
    }else if(nine){S.drawNine(g,im,a,0,nine,0,0,w,h,Math.min(1,w/a.w),dpr);if(slot==='v3-card-title'||slot==='v3-button-big'){g.globalCompositeOperation='source-atop';g.fillStyle=slot==='v3-card-title'?'#234f30d9':'#234f30c2';g.fillRect(0,0,w,h);g.globalCompositeOperation='source-over';}}
    else{const s=Math.min(w/a.w,h/a.h);S.drawArt(g,im,a,0,(w-a.w*s)/2,(h-a.h*s)/2,s,dpr);}
    n.dataset.painted='true';
   }
  }
  // Mutation fires as soon as the selected card changes, including reduced
  // motion. Paint with layout sizes immediately, after FLIP, and next frame.
  function repaint(){paint();win.requestAnimationFrame(paint);win.clearTimeout(afterFrame);afterFrame=win.setTimeout(()=>win.requestAnimationFrame(paint),310);}
  const spots=new win.MutationObserver(repaint);for(const card of host.querySelectorAll('.gf-deck-card'))spots.observe(card,{attributes:true,attributeFilter:['data-spot']});
  const resize=new win.ResizeObserver(()=>{layout();paint();});resize.observe(host);
  const input=e=>{const value=e.type==='keydown'?'keyboard':'pointer';host.dataset.input=value;if(parentDoc)parentDoc.body.dataset.rcInput=value;
   // The site's sound/back controls live outside the iframe. An arrow returns
   // navigation to the deck; Enter still activates the focused site control.
   if(parentDoc&&e.type==='keydown'&&e.currentTarget===parentDoc&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&['ArrowLeft','ArrowRight'].includes(e.key)&&!parentDoc.querySelector('dialog[open]')){e.preventDefault();win.focus();win.dispatchEvent(new win.KeyboardEvent('keydown',{key:e.key,code:e.code,repeat:e.repeat,bubbles:true,cancelable:true}));}
  };
  for(const d of new Set([doc,parentDoc].filter(Boolean))){d.addEventListener('keydown',input,true);d.addEventListener('pointerdown',input,true);}
  if(parentDoc)parentDoc.body.dataset.rcInput=host.dataset.input;
  function dispose(){if(disposed)return;disposed=true;resize.disconnect();spots.disconnect();gone.disconnect();win.clearTimeout(afterFrame);win.removeEventListener('pagehide',dispose);style.remove();parentStyle?.remove();if(parentDoc)delete parentDoc.body.dataset.rcInput;for(const d of new Set([doc,parentDoc].filter(Boolean))){d.removeEventListener('keydown',input,true);d.removeEventListener('pointerdown',input,true);}}
  const gone=new win.MutationObserver(()=>{if(!host.isConnected)dispose();});gone.observe(doc.body,{childList:true,subtree:true});win.addEventListener('pagehide',dispose,{once:true});
  layout();for(const p of pictures)image(host.dataset.layout==='tall'&&['menu-stage','menu-endless'].includes(p.slot)?p.slot+'-tall':p.slot);image('v3-card-cream');paint();doc.fonts?.ready?.then(repaint);
 }
 function render(host,c){
  if(c.kind==='stage')return stageWindow(host,c);
  if(c.kind==='menu')return menuWindow(host,c);
 }
 async function prepare({data,images,base}){
  if(!inputBound){inputBound=true;window.addEventListener('keydown',()=>{keyboardInput=true;},true);window.addEventListener('pointerdown',()=>{keyboardInput=false;},true);}
  // 3차 무대 자리 값: 시작 카드의 배율과 놀이 화면 짜기가 같이 쓴다.
  const stages=fetch(new URL(`stages.json?v=${data.version}`,base)).then(r=>{if(!r.ok)throw Error(`stages.json: 상태 ${r.status}`);return r.json();}).then(s=>{family.stages=s;});
  await Promise.all([stages,...['star','empty','large','small'].map(key=>new Promise((resolve,reject)=>{const img=new window.Image();images[key]=img;img.onload=resolve;img.onerror=()=>reject(Error('시작 창 그림을 불러오지 못했어요'));img.src=new URL((data.art.ui.result[key]||data.art.slots[key]).file,base).href;}))]);
 }
 family.start={render,model,prepare};
})();
