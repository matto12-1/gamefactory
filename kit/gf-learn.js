(function () {
  'use strict';
  function diff(wrong, right) {
    const a = [...wrong], b = [...right], table = Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
    for(let i=a.length-1;i>=0;i--) for(let j=b.length-1;j>=0;j--) table[i][j]=a[i]===b[j]?table[i+1][j+1]+1:Math.max(table[i+1][j],table[i][j+1]);
    const left=[],rightSide=[];
    const add=(out,s,mark)=>{const last=out.at(-1);if(last?.mark===mark&&mark!=='space-add'&&mark!=='space-join')last.s+=s;else out.push({s,mark});};
    let i=0,j=0;
    while(i<a.length||j<b.length) {
      if(i<a.length&&j<b.length&&a[i]===b[j]) { add(left,a[i],'same');add(rightSide,b[j],'same');i++;j++; }
      else if(i<a.length&&(j===b.length||table[i+1][j]>=table[i][j+1])) {add(left,a[i],a[i]===' '?'space-join':'diff');i++;}
      else {add(rightSide,b[j],b[j]===' '?'space-add':'diff');j++;}
    }
    return {wrong:left,right:rightSide};
  }
  function reaskCreate({rng,minS=20,maxS=30,maxPerItem=2,maxQueue=3}) {
    const queue=[],counts=new Map(),inFlight=new Set();let end=Infinity;
    const api={
      add(item,now,endAt) {
        end=endAt;
        if(queue.length>=maxQueue||queue.some(q=>q.item===item)||inFlight.has(item)||(counts.get(item)||0)>=maxPerItem)return false;
        const at=Math.min(now+minS+rng()*(maxS-minS),endAt-5);
        if(at-now<8)return false;
        queue.push({item,at});queue.sort((a,b)=>a.at-b.at);return true;
      },
      due(now) { if(!queue.length||queue[0].at>now+1e-9)return null;const {item}=queue.shift();counts.set(item,(counts.get(item)||0)+1);inFlight.add(item);return item; },
      result(item,kind,now) {inFlight.delete(item);if(kind!=='right')api.add(item,now,end);},
      size:()=>queue.length
    };return api;
  }
  function adaptCreate({grade,packs,warmup=3}) {
    // packs preserves the content's named order and the selected grade's base shares.
    const base={...(packs.base||packs.mix?.[grade]||{})},order=packs.order||Object.keys(packs.bands||base),judgments=[],stays=[];
    let level=0,rest=0,first=warmup,factor=1;
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    return {
      judge(right) {
        if(first>0){first--;return;}
        judgments.push(!!right);if(judgments.length>8)judgments.shift();
        if(rest>0){rest--;return;}
        const rate=judgments.filter(Boolean).length/judgments.length;
        const down=judgments.slice(-2).length===2&&judgments.slice(-2).every(v=>!v)||judgments.length>=6&&rate<.65;
        const next=clamp(level+(down?-1:judgments.length>=6&&rate>=.9?1:0),-2,2);
        if(next!==level){level=next;rest=4;judgments.length=0;}
      },
      level(value) {if(value!==undefined)level=clamp(value,-2,2);return level;},
      mix() {
        const entries=Object.entries(base),used=order.filter(p=>base[p]>0),edge=level>0?used.at(-1):used[0],neighbor=order[order.indexOf(edge)+(level>0?1:-1)];
        const share=level&&neighbor?Math.abs(level)*.2:0;
        return [...entries.map(([pack,n])=>({pack,share:Math.round(n*(1-share)*1e12)/1e12})),...(share?[{pack:neighbor,share}]:[])];
      },
      wrongShareDelta:()=>level*.05,
      spawnSlow:()=>1+Math.max(0,-level)*.1,
      stay:{note(kind) {
        if(kind!=='right'&&kind!=='missed')return;
        stays.push(kind);if(stays.length>8)stays.shift();
        if(stays.length>=6&&stays.slice(-6).filter(v=>v==='missed').length>=2){factor=clamp(factor*1.15,.85,1.3);stays.length=0;}
        else if(stays.length===8&&stays.every(v=>v==='right')){factor=clamp(factor*.95,.85,1.3);stays.length=0;}
      },factor:()=>factor}
    };
  }
  function pickReview(review) {
    const rank=r=>r.kind==='wrong'?(r.overcome?1:0):2;
    return review.slice().sort((a,b)=>rank(a)-rank(b)).slice(0,5);
  }
  // Numbered runner stages keep their original ladder, with a short recovery window.
  function runnerAdapt() {
    const judgments=[];let stage=1,recovery=0,offset=0,speed=1;
    return {
      judge(right) {
        judgments.push(!!right);if(judgments.length>8)judgments.shift();
        if(judgments.length>=2&&judgments.slice(-2).every(v=>!v)){recovery=3;speed=Math.min(1.3,speed*1.15);}
        else if(judgments.length===8&&judgments.every(Boolean))speed=Math.max(.9,speed*.95);
      },
      next(n) {
        const wanted=n<=8?1:n<=20?2:3,rate=judgments.length?judgments.filter(Boolean).length/judgments.length:1;
        if(wanted>stage&&judgments.length>=6&&rate>=.8)stage=wanted;
        const lowered=recovery>0;if(lowered)recovery--;
        return Math.max(1,Math.min(3,stage+offset-(lowered?1:0)));
      },
      level(value) {if(value!==undefined)offset=Math.max(-2,Math.min(2,value));return offset;},
      factor:()=>Math.max(speed,1+Math.max(0,-offset)*.1),
      spawnSlow:()=>1+Math.max(0,-offset)*.1
    };
  }
  window.GFLearn={diff,reask:{create:reaskCreate},adapt:{create:adaptCreate,runner:runnerAdapt},pickReview};
})();
