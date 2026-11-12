(function () {
  'use strict';
  const S=((window.GFFamilies=window.GFFamilies||{}).survivor||={});
  const CSS=`.sv-pick .sv-prose,.sv-meta .sv-prose,.sv-battle-result .sv-prose{font-family:Pretendard,sans-serif;font-weight:400;color:#514838;text-wrap:wrap}.sv-prose strong,.sv-battle-result .sv-prose strong{font-family:inherit;font-weight:700;color:#26241f}`;
  const phrase=s=>typeof s==='string'&&s.length>0&&s.length<=24&&!/[.!?。]|(?:어요|에요|예요|해요|지요)$|(?:은|는|이|가|을|를|으로|에서|에서는|게|에)\s/.test(s);
  function names(content) {
    const all=[];
    for(const k of ['people','relics','weapons','evolutions','battles','eras','bosses'])for(const x of content?.[k]||[])if(x.name)all.push(x.name);
    for(const p of content?.packs||[]){all.push(p.name,p.battle?.name);for(const x of [...(p.people||[]),...(p.deputies||[]),p.general].filter(Boolean))all.push(x.name);}
    return all.filter(Boolean);
  }
  function select(text,content,opt={}) {
    text=String(text??'');
    const pack=opt.pack,qs=(pack?.questions||[]).filter(q=>opt.from?q.from===opt.from:S.rules.sourceText(pack,q.from)===text);
    const focus=[],keys=[];
    for(const q of qs){
      for(const line of [q.q,q.key]){
        const head=/^(.{1,24}?)(?:에서는|에서|은|는|이|가|을|를)(?=\s)/.exec(line||'')?.[1]?.split(/인\s/).pop();
        for(const term of (head||'').split(/(?:과|와)\s+|·/))if(phrase(term)&&q.key?.includes(term))focus.push(term);
      }
      if(phrase(q.key))keys.push(q.key);
      // 검수 자료의 key가 문장일 때는 그 안에 실제로 있는 정답 낱말만 추린다.
      if(phrase(q.a)&&!['O','X'].includes(q.a)&&q.key?.includes(q.a))keys.push(q.a);
    }
    for(const key of opt.keys||[])if(phrase(key))keys.push(key);
    const picked=[],seen=new Set();
    for(const group of [focus,keys,names(content)])for(const word of [...new Set(group)].sort((a,b)=>b.length-a.length)){
      if(seen.has(word)||picked.length>=6)continue;
      seen.add(word);const at=text.indexOf(word);if(at<0)continue;
      if(picked.some(p=>at<p.at+p.word.length&&at+word.length>p.at))continue;
      picked.push({word,at});
    }
    return picked.sort((a,b)=>a.at-b.at).map(p=>p.word);
  }
  function fill(node,text,content,opt={}) {
    text=String(text??'');const doc=node.ownerDocument||document;
    if(!doc.getElementById('sv-prose-style')){const style=doc.createElement('style');style.id='sv-prose-style';style.textContent=CSS;doc.head.appendChild(style);}
    const words=opt.words||select(text,content,opt),ranges=[];
    for(const word of new Set(words)){const at=text.indexOf(word);if(at>=0&&!ranges.some(p=>at<p.at+p.word.length&&at+word.length>p.at))ranges.push({word,at});}
    ranges.sort((a,b)=>a.at-b.at);
    node.textContent='';node.replaceChildren();node.classList.add('sv-prose');
    let at=0;
    const part=(tag,value)=>{const n=doc.createElement(tag);n.textContent=value;node.appendChild(n);};
    for(const p of ranges){if(p.at>at)part('span',text.slice(at,p.at));part('strong',p.word);at=p.at+p.word.length;}
    if(at<text.length)part('span',text.slice(at));
    return node;
  }
  S.prose={select,fill};
})();
