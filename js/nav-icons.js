// 바깥 틀 아이콘 한 벌(2026-10-29 대표 「나. 깔끔한 게임 스토어」): 48칸에 그린 둥근 면 아이콘.
// 진한 색 한 겹 + 옅은 색 한 겹 + 흰 반짝임. 아이콘마다 뜻 색 하나(홈 코랄 · 순위표 노랑 · 도장판 초록 …).
// 가는 선 아이콘과 옅은 받침 네모는 되살리지 않는다(결정 대장). 닫기 · 메뉴 · 화살표만 둥근 선.
// 과목 아이콘은 과목 색(--nav-color, sidenav.js가 넣음)을 따르고 없으면 기본색이다.
const star=(cx,cy,R,r=R*.48)=>{
  let d='';
  for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,k=i%2?r:R;d+=`${i?'L':'M'}${(cx+k*Math.cos(a)).toFixed(2)} ${(cy+k*Math.sin(a)).toFixed(2)}`}
  return `${d}Z`;
};
const round=(d,fill)=>`<path d="${d}" fill="${fill}" stroke="${fill}" stroke-width="1.4" stroke-linejoin="round"/>`;
const line=(d,color,width)=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
// 과목 색을 따르는 진한 칠 · 옅은 칠
const ink=def=>`style="fill:var(--nav-color,${def})"`;
const wash=def=>`style="fill:color-mix(in srgb,var(--nav-color,${def}) 30%,#fff)"`;
const book=(x,y,w,fill)=>`<rect x="${x}" y="${y}" width="${w}" height="10" rx="3" ${fill}/><path d="M${x+w-21} ${y+2.3}h17.5a1.6 1.6 0 0 1 1.6 1.6v2.2a1.6 1.6 0 0 1-1.6 1.6H${x+w-21}Z" fill="#fff"/><path d="M${x+w-18} ${y+5}h14" stroke="#000" stroke-opacity=".12" stroke-width="1"/>`;
const books=def=>book(5,32,36,ink(def))+book(9,21,35,wash(def))+book(6,10,34,ink(def));
const speaker=`<path d="M7 18.5A2.5 2.5 0 0 1 9.5 16H15l9.2-7.4A1.8 1.8 0 0 1 27 10v28a1.8 1.8 0 0 1-2.8 1.4L15 32H9.5A2.5 2.5 0 0 1 7 29.5Z" fill="#f97316"/><path d="M7 18.5A2.5 2.5 0 0 1 9.5 16H15v16H9.5A2.5 2.5 0 0 1 7 29.5Z" fill="#ea580c"/>`;
const map=`<path d="M5 13.2a2 2 0 0 1 1.3-1.9L16 8l15 4.5 9.4-3.3A2 2 0 0 1 43 11.1v24.2a2 2 0 0 1-1.3 1.9L31 41l-15-4.5-8.4 3A2 2 0 0 1 5 37.6Z" fill="#22a05b"/><path d="M16 8l15 4.5V41l-15-4.5Z" fill="#86dca8"/>`
  +line('M10.5 31.5c3.5-1 4.5-5 8.5-6s6 2 9.5 0 3.5-6 7-7.5','#fff',2.4).replace('/>',' stroke-dasharray=".1 4.4"/>')
  +line('M35.5 4.5v13','#b42318',2)+round('M36.2 4.6l6.8 2.5-6.8 2.5Z','#ef4444');

const art={
  home:`<path d="M11 23.5 24 13l13 10.5V39a4 4 0 0 1-4 4H15a4 4 0 0 1-4-4Z" fill="#ffb8ad"/><rect x="22.9" y="3.4" width="2.2" height="9" rx="1.1" fill="#e2412e"/>${round('M25.4 3.8l7 2.6-7 2.6Z','#f25c4b')}`
    +`<path d="M5.6 22.2 22.1 8.9a3 3 0 0 1 3.8 0l16.5 13.3a2.4 2.4 0 0 1-3 3.8L24 13.6 8.6 26a2.4 2.4 0 0 1-3-3.8Z" fill="#f25c4b"/>`
    +`<circle cx="24" cy="24.6" r="4.6" fill="#fff"/>${line('M24 22.2v2.6l1.8 1.2','#f25c4b',1.6)}<rect x="14.4" y="29" width="5" height="5" rx="1.4" fill="#fff"/><rect x="28.6" y="29" width="5" height="5" rx="1.4" fill="#fff"/><path d="M19.6 43v-6.4a4.4 4.4 0 0 1 8.8 0V43Z" fill="#f25c4b"/>`,
  trophy:line('M14.5 11.5h-4a2.5 2.5 0 0 0-2.5 2.5c0 5.8 3.9 9.9 8.8 10.5','#f59e0b',3.6)+line('M33.5 11.5h4a2.5 2.5 0 0 1 2.5 2.5c0 5.8-3.9 9.9-8.8 10.5','#f59e0b',3.6)
    +`<rect x="21" y="28" width="6" height="8" fill="#f59e0b"/><rect x="14" y="34.5" width="20" height="7.5" rx="3.75" fill="#f59e0b"/><path d="M14.5 7h19a2 2 0 0 1 2 2v9.5a11.5 11.5 0 0 1-23 0V9a2 2 0 0 1 2-2Z" fill="#ffc53d"/>`
    +round(star(24,17.6,5.8),'#fff7dc')+line('M16.8 11.5v5.5','#fff',2.2).replace('/>',' stroke-opacity=".55"/>'),
  stamp:`<rect x="7" y="9.5" width="34" height="33.5" rx="7" fill="#2fa35a"/><rect x="11.5" y="16" width="25" height="22.5" rx="3.5" fill="#effaf2"/>`
    +`<circle cx="24" cy="27.2" r="7.8" fill="#bde8cb"/><circle cx="24" cy="27.2" r="7.8" fill="none" stroke="#2fa35a" stroke-width="1.8" stroke-dasharray="2.4 2.1"/>`+round(star(24,27.5,4.6),'#2fa35a')
    +`<rect x="14.5" y="5" width="4" height="8.5" rx="2" fill="#1f7a40"/><rect x="22" y="5" width="4" height="8.5" rx="2" fill="#1f7a40"/><rect x="29.5" y="5" width="4" height="8.5" rx="2" fill="#1f7a40"/>`,
  grid:`<rect x="5" y="5" width="17.5" height="17.5" rx="5" fill="#3b7cf0"/><rect x="25.5" y="5" width="17.5" height="17.5" rx="5" fill="#6aa0f8"/><rect x="5" y="25.5" width="17.5" height="17.5" rx="5" fill="#6aa0f8"/><rect x="25.5" y="25.5" width="17.5" height="17.5" rx="5" fill="#3b7cf0"/>`
    +`<path d="M11.6 9.9v8.2a.9.9 0 0 0 1.4.8l6.2-4.1a.9.9 0 0 0 0-1.5L13 9.1a.9.9 0 0 0-1.4.8Z" fill="#fff"/><path d="M29 18.4l3.8-5 2.6 3.1 1.9-2.1 3.3 4Z" fill="#fff"/><circle cx="36.4" cy="10.2" r="1.8" fill="#fff"/>`
    +`<rect x="9" y="30" width="9.5" height="2.4" rx="1.2" fill="#fff"/><rect x="9" y="34.1" width="9.5" height="2.4" rx="1.2" fill="#fff"/><rect x="9" y="38.2" width="6.5" height="2.4" rx="1.2" fill="#fff"/>`
    +`<rect x="29.4" y="29.4" width="4.2" height="4.2" rx="1.2" fill="#fff"/><rect x="35" y="29.4" width="4.2" height="4.2" rx="1.2" fill="#fff"/><rect x="29.4" y="35" width="4.2" height="4.2" rx="1.2" fill="#fff"/><rect x="35" y="35" width="4.2" height="4.2" rx="1.2" fill="#fff"/>`,
  branches:`<path d="M5 13a4 4 0 0 1 4-4h9.2a3 3 0 0 1 2.2.9L23.5 13H39a4 4 0 0 1 4 4v19a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4Z" fill="#7c4ff0"/><rect x="10" y="16" width="28" height="9" rx="2" fill="#efe9ff"/><path d="M4.3 22.4A3 3 0 0 1 7.3 19h33.4a3 3 0 0 1 3 3.4l-2 15A4 4 0 0 1 37.8 41H10.2a4 4 0 0 1-4-3.6Z" fill="#a78bfa"/>`,
  subject:books('#ec4f8f'),
  filter:`<rect x="6" y="7" width="36" height="7" rx="3.5" fill="#64748b"/><path d="M9 14h30L28.5 27h-9Z" fill="#c9d3e0"/><path d="M19.5 26h9v13.3a2 2 0 0 1-1.1 1.8l-5 2.5a2 2 0 0 1-2.9-1.8Z" fill="#64748b"/>`,
  search:`<circle cx="20.5" cy="20.5" r="12.5" fill="#cfe0ff"/><circle cx="20.5" cy="20.5" r="12.5" fill="none" stroke="#3b7cf0" stroke-width="4.5"/>${line('M30 30l9.5 9.5','#3b7cf0',6.5)}${line('M14.6 17.6a6.5 6.5 0 0 1 5-4.6','#fff',2.6)}`,
  sound:speaker+line('M32 18.5a8 8 0 0 1 0 11','#fbbf24',3.6)+line('M36.5 13a15 15 0 0 1 0 22','#fbbf24',3.6),
  'sound-off':speaker+line('M32.5 19.5l9 9M41.5 19.5l-9 9','#94a3b8',3.6),
  person:`<circle cx="24" cy="15.5" r="8.5" fill="#8b5cf6"/><path d="M7.5 39.5C7.5 31 14.9 26 24 26s16.5 5 16.5 13.5a3 3 0 0 1-3 3h-27a3 3 0 0 1-3-3Z" fill="#c4b0ff"/>`,
  clock:`<circle cx="24" cy="25" r="18" fill="#14b8a6"/><circle cx="24" cy="25" r="13.5" fill="#e6fbf7"/>${line('M24 16.5V25l5.8 3.6','#0f766e',3.4)}<rect x="20" y="3.5" width="8" height="4" rx="2" fill="#14b8a6"/>`,
  spark:round('M22 6c1.6 8.8 5.2 12.4 14 14-8.8 1.6-12.4 5.2-14 14-1.6-8.8-5.2-12.4-14-14 8.8-1.6 12.4-5.2 14-14Z','#ff6b81')+round('M37 29c.8 4.2 2.4 5.8 6.5 6.5-4.1.7-5.7 2.3-6.5 6.5-.7-4.2-2.4-5.8-6.5-6.5 4.1-.7 5.8-2.3 6.5-6.5Z','#ffc94d'),
  flame:`<path d="M24.5 4c1 6.5 9.5 10.8 11.4 18.5 2.2 9-3.6 19.5-12 19.5-7.7 0-12.9-6.2-11.9-13.8.6-4.6 3.2-7.9 6.1-10.1-.2 4.2 1.4 6.9 3.6 7.6-1.8-6.7.5-14.6 2.8-21.7Z" fill="#f97316"/><path d="M24 25.5c4.6 3.4 6.8 6.6 6.4 10.2-.4 3.6-3.3 6.3-6.6 6.3-3.6 0-6.4-2.9-6.2-6.6.2-3.5 2.7-6.5 6.4-9.9Z" fill="#fde047"/>`,
  duo:`<circle cx="32.5" cy="15" r="6.2" fill="#93c5fd"/><path d="M22 36.5c0-6.6 4.7-11 10.5-11S43 29.9 43 36.5v1a2.5 2.5 0 0 1-2.5 2.5h-16a2.5 2.5 0 0 1-2.5-2.5Z" fill="#93c5fd"/>`
    +`<circle cx="18" cy="17" r="7.2" fill="#3b82f6" stroke="#fff" stroke-width="2.6" paint-order="stroke"/><path d="M5 40c0-7.6 5.8-12.5 13-12.5S31 32.4 31 40v.5a2.5 2.5 0 0 1-2.5 2.5h-21A2.5 2.5 0 0 1 5 40.5Z" fill="#3b82f6" stroke="#fff" stroke-width="2.6" paint-order="stroke"/>`,
  map,
  bolt:line('M3.5 21h6M2 27.5h6M4 34h5.5','#fdba74',2.8)+`<rect x="23.5" y="4" width="7" height="5" rx="2" fill="#ea580c"/>${line('M38.6 12.6l2.6-2.6','#ea580c',3)}<circle cx="27" cy="27" r="16" fill="#f97316"/><circle cx="27" cy="27" r="11.8" fill="#fff7ed"/>${line('M27 27l5.2-6.2','#ea580c',3)}<circle cx="27" cy="27" r="2.6" fill="#ea580c"/>`,
  tv:`<rect x="21.5" y="34" width="5" height="6" fill="#0369a1"/><rect x="14" y="39" width="20" height="4" rx="2" fill="#0369a1"/><rect x="5" y="8" width="38" height="27" rx="5" fill="#0ea5e9"/><rect x="9.5" y="12.5" width="29" height="18" rx="2.5" fill="#bae6fd"/>`
    +round('M21.2 23.4v-6.2a.8.8 0 0 1 1.2-.7l5.3 3.1a.8.8 0 0 1 0 1.4l-5.3 3.1a.8.8 0 0 1-1.2-.7Z','#0ea5e9'),
  calendar:`<rect x="6" y="9" width="36" height="33" rx="6" fill="#ffe1e6"/><path d="M6 15a6 6 0 0 1 6-6h24a6 6 0 0 1 6 6v4H6Z" fill="#f43f5e"/><rect x="14" y="5" width="4" height="8" rx="2" fill="#be123c"/><rect x="30" y="5" width="4" height="8" rx="2" fill="#be123c"/>`
    +round('M24 37.2s-7.6-4.4-7.6-9.4a4.1 4.1 0 0 1 7.6-2.1 4.1 4.1 0 0 1 7.6 2.1c0 5-7.6 9.4-7.6 9.4Z','#f43f5e'),
  korean:`<path d="M27.5 29h11a3.5 3.5 0 0 1 3.5 3.5V38a3.5 3.5 0 0 1-3.5 3.5H38v3.2l-4.2-3.2h-6.3A3.5 3.5 0 0 1 24 38v-5.5a3.5 3.5 0 0 1 3.5-3.5Z" ${wash('#c8553d')}/>`
    +`<path d="M11 5h24a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5H21l-7.4 6.2A1.4 1.4 0 0 1 11.3 34v-5H11a5 5 0 0 1-5-5V10a5 5 0 0 1 5-5Z" ${ink('#c8553d')}/><rect x="13" y="11.5" width="20" height="3.4" rx="1.7" fill="#fff"/><rect x="13" y="18.5" width="12.5" height="3.4" rx="1.7" fill="#fff"/>`,
  math:`<rect x="5" y="5" width="38" height="38" rx="9" ${ink('#2f6fb0')}/><path d="M24 10v28M10 24h28" fill="none" stroke-width="1.6" style="stroke:color-mix(in srgb,var(--nav-color,#2f6fb0) 45%,#fff)"/>`
    +line('M15.5 11.5v8M11.5 15.5h8M28.5 15.5h8M12.6 29.1l5.8 5.8M18.4 29.1l-5.8 5.8M28.5 30h8M28.5 35h8','#fff',3),
  social:`<circle cx="24" cy="24" r="18" ${wash('#a8741f')}/><path d="M14.3 12.4c3 .6 4.4 2.7 3.9 5.3-.4 2.2-3.2 2.4-3.6 4.9-.4 2.6 2 3.6 1.6 6.4-.3 2.2-2.6 3.3-4.6 3.3A18 18 0 0 1 14.3 12.4Z" ${ink('#a8741f')}/>`
    +`<path d="M27.6 6.9c-.5 2.6.8 4.4 3.3 4.8 2.8.5 3.7 3.2 2.3 5.3-1.6 2.4-5.4 1.4-6.4 4.3-.9 2.6 1.6 4.2 4.4 4.4 3.3.2 4.6 3.4 3.6 6.4l-.2.6A18 18 0 0 0 27.6 6.9Z" ${ink('#a8741f')}/><ellipse cx="24" cy="24" rx="7.5" ry="17" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.6"/><path d="M6.5 24h35M9 15h30M9 33h30" stroke="#fff" stroke-opacity=".7" stroke-width="1.6"/><circle cx="24" cy="24" r="18" fill="none" stroke-width="2.8" style="stroke:var(--nav-color,#a8741f)"/>`,
  science:`<path d="M20 6h8v11.2l10.6 17.4A5 5 0 0 1 34.3 42H13.7a5 5 0 0 1-4.3-7.4L20 17.2Z" ${wash('#2e8b6e')}/><path d="M13.4 28h21.2l4 6.6A5 5 0 0 1 34.3 42H13.7a5 5 0 0 1-4.3-7.4Z" ${ink('#2e8b6e')}/>`
    +`<path d="M17.5 5.5h13" fill="none" stroke-width="3.6" stroke-linecap="round" style="stroke:var(--nav-color,#2e8b6e)"/><circle cx="20.5" cy="35" r="2.3" fill="#fff"/><circle cx="27.5" cy="32" r="1.5" fill="#fff"/><circle cx="25" cy="22" r="1.7" ${ink('#2e8b6e')}/>`,
  info:`<path d="M4 34.5h40l-2 4.2a3 3 0 0 1-2.7 1.8H8.7A3 3 0 0 1 6 38.7Z" ${wash('#4a5bc4')}/><rect x="8" y="8" width="32" height="24" rx="4" ${ink('#4a5bc4')}/><rect x="11.5" y="11.5" width="25" height="17" rx="2" fill="#fff"/>`
    +`<path d="M20.5 16.5 16.5 20l4 3.5M27.5 16.5l4 3.5-4 3.5" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--nav-color,#4a5bc4)"/>`,
  safety:`<path d="M24 4.5 39 10v11.5c0 9.6-6.3 17.2-15 21.5-8.7-4.3-15-11.9-15-21.5V10Z" ${ink('#7a8a99')}/><path d="M24 4.5V43c-8.7-4.3-15-11.9-15-21.5V10Z" fill="#fff" fill-opacity=".2"/>${line('M16.5 23.5l5.2 5.2 9.8-10','#fff',3.8)}`,
  hourglass:`<path d="M13.5 9.5h21c0 7-4.5 10.6-7.6 14.5 3.1 3.9 7.6 7.5 7.6 14.5h-21c0-7 4.5-10.6 7.6-14.5-3.1-3.9-7.6-7.5-7.6-14.5Z" fill="#fde68a"/><path d="M17.6 13h12.8c-.7 3.3-3.8 5.5-6.4 8.3-2.6-2.8-5.7-5-6.4-8.3Z" fill="#f59e0b"/><path d="M16.4 37c.8-3.6 4-6 7.6-7.6 3.6 1.6 6.8 4 7.6 7.6Z" fill="#f59e0b"/><rect x="10" y="4" width="28" height="5.5" rx="2.75" fill="#f97316"/><rect x="10" y="38.5" width="28" height="5.5" rx="2.75" fill="#f97316"/>`,
  infinity:line('M24 24c-3.2-4.2-6.3-7.2-10-7.2a7.2 7.2 0 0 0 0 14.4c3.7 0 6.8-3 10-7.2s6.3-7.2 10-7.2a7.2 7.2 0 0 1 0 14.4c-3.7 0-6.8-3-10-7.2Z','#ec4899',5.6)+line('M10.4 20.6a5 5 0 0 1 3.6-1.6','#fbcfe8',1.8)+line('M30.4 20.6a5 5 0 0 1 3.6-1.6','#fbcfe8',1.8),
  lock:line('M16 21v-4.5a8 8 0 0 1 16 0V21','#64748b',4)+`<rect x="10" y="20" width="28" height="22" rx="5" fill="#94a3b8"/><circle cx="24" cy="29.5" r="3" fill="#fff"/><rect x="22.6" y="30" width="2.8" height="6.5" rx="1.4" fill="#fff"/>`,
  medal:round('M15 28l-5 14 6-2.2 3.4 5L24 33Z','#1f7a40')+round('M33 28l5 14-6-2.2-3.4 5L24 33Z','#1f7a40')+`<circle cx="24" cy="20" r="15" fill="#2fa35a"/><circle cx="24" cy="20" r="11" fill="#bde8cb"/>`+round(star(24,20.4,7),'#2fa35a')
};
art.stage=art.map;
// 뜻 색이 없는 둥근 선(24칸): 닫기 · 메뉴 · 넘김
const strokes={close:'m6 6 12 12M18 6 6 18',more:'M4 6h16M4 12h16M4 18h16',chevron:'m9 5.5 6.5 6.5L9 18.5'};

export const iconNames=[...Object.keys(art),...Object.keys(strokes)];
export function navIcon(name) {
  if(strokes[name])return `<svg class="ic ic-line" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="${strokes[name]}"/></svg>`;
  return `<svg class="ic ic-${art[name]?name:'grid'}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">${art[name]??art.grid}</svg>`;
}
