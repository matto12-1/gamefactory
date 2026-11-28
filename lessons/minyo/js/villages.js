// 지도 마을은 그 곡의 사람과 소품을 그대로 줄인다. 각 2×2칸에서 가장 많은 색을 골라 점 굵기를 맞춘다.
(function () {
  'use strict';
  const cache = new Map();
  function reduce(source) {
    const out = document.createElement('canvas'); out.width = source.width / 2; out.height = source.height / 2;
    const pixels = source.getContext('2d').getImageData(0, 0, source.width, source.height).data;
    const ctx = out.getContext('2d'), image = ctx.createImageData(out.width, out.height);
    for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
      const colors = new Map();
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
        const at = ((y * 2 + j) * source.width + x * 2 + i) * 4;
        const rgba = Array.from(pixels.subarray(at, at + 4)), key = rgba.join(',');
        const color = colors.get(key) || { rgba, count: 0 }; color.count++; colors.set(key, color);
      }
      const color = [...colors.values()].sort((a, b) => b.count - a.count || b.rgba[3] - a.rgba[3])[0].rgba;
      image.data.set(color, (y * out.width + x) * 4);
    }
    ctx.putImageData(image, 0, 0); return out;
  }
  // 320×180 원본 좌표. 큰 모양은 달집 / 풍물 행렬 / 달과 원 / 배 / 그물로 갈린다.
  const layouts = {
    wolwol: [['daljip-0',34,0],['moon',238,6],['ring-a-stand',96,68],['ring-b-stand',150,100],['ring-c-stand',204,68],['hero-idle',154,48]],
    kwaeji: [['lanterns',82,12],['torch-1',34,28],['torch-1',264,28],['leader-idle',54,100],['follower-idle',112,80],['hero-raise',180,60],['rope-throw',232,100]],
    ganggang: [['moon',136,6],['ring-a-stand',78,44],['ring-b-stand',180,44],['ring-c-stand',48,98],['ring-a-stand',210,98],['hero-idle',130,108]],
    geomun: [['flags',166,26],['rower-a-hold',84,56],['rower-b-hold',128,56],['hero-hold',172,56],['boat',64,112]],
    baennorae: [['bank',0,6],['boat',64,74],['guest-drum',78,100],['guest-fan',105,100],['rower-a-hold',134,70],['hero-hold',180,70]],
    garae: [['soil-4',4,132],['puller-a-hold',54,100],['hero-hold',100,104],['leader-hold',156,96],['garae-planted',188,84]],
    unjae: [['puller-a-hold',30,92],['puller-b-hold',78,100],['leader-hold',206,96],['timber',160,128],['hero-hold',120,108]],
    myeolchi: [['puller-a-hold',12,94],['leader-hold',64,84],['hero-hold',112,88],['net-body',172,112],['net-body',220,112],['net-body',172,128],['net-body',220,128]],
    // 북쪽 세 곡(2026-11-13): 대장간 가마와 풀무 / 밭과 풀 더미 / 버드나무 그네
    punggu: [['flame-4',248,40],['furnace',236,86],['bellows-up',36,140],['puller-a-hold',40,93],['hero-hold',96,94],['leader-hold',176,100]], // 발판 윗면 y153(풀무 칸 안 y13)에 발
    jajinari: [['pile-4',8,144],['puller-a-hold',44,100],['hero-hold',100,104],['leader-hold',170,92],['weed-a',150,154],['weed-b',214,156],['basket',250,146]],
    // 버드나무는 강가 배경에서 오려 그네와 한 장으로 구웠다(willow-swing). 나무 밑동이 사람 발과 같은 땅 y164
    // 판 17 둥당기(2026-11-22): 앉은 아낙과 꼬마 앞에 물방구, 오른쪽에 물동이 낀 할머니와 모닥불
    dungdang: [['deco-1a',268,108],['puller-a-hold',40,100],['mulbanggu',52,140],['hero-hold',104,100],['mulbanggu',116,140],['puller-b-hold',168,100],['mulbanggu',180,140],['leader-hold',220,96]],
    singosan: [['willow-swing',6,41],['puller-a-hold',118,104],['hero-hold',164,104],['puller-c-hold',208,104],['leader-hold',252,98]],
  };
  async function scene(id) {
    if (!layouts[id]) throw Error(`지도 장면 없음: ${id}`);
    if (!cache.has(id)) cache.set(id, (async () => {
      const folder=id==='baennorae'?'jajin':id;
      const response = await fetch(`art/${folder}/sprites.json`); if (!response.ok) throw Error(`지도 그림 목록: ${id}`);
      const meta = await response.json(), images = {};
      await Promise.all([...new Set(layouts[id].map(p => p[0]))].map(name => new Promise((done, fail) => {
        const image = new Image(); image.onload = () => { images[name] = image; done(); };
        image.onerror = () => fail(Error(`지도 그림: ${id}/${name}`));
        image.src = `art/${folder}/${meta[name + '.png']?.file || name + '.png'}`;
      })));
      const source = document.createElement('canvas'); source.width = 320; source.height = 180;
      const c = source.getContext('2d'); c.imageSmoothingEnabled = false;
      for (const [name,x,y] of layouts[id]) c.drawImage(images[name], x, y);
      const large = reduce(source); return { large, small: reduce(large) };
    })());
    return cache.get(id);
  }
  function paint(canvas, id, small = false) {
    canvas.width = small ? 80 : 160; canvas.height = small ? 45 : 90;
    canvas.dataset.village = id; canvas.style.imageRendering = 'pixelated';
    // 아직 안 만든 흐린 곡(모심기 · 밀양아리랑 · 옹헤야)은 마을 장면이 없다. 빈 칸으로 두고 오류를 내지 않는다
    if (!layouts[id]) { canvas.dataset.empty = 'true'; return Promise.resolve(); }
    return scene(id).then(images => {
      const c = canvas.getContext('2d'); c.clearRect(0,0,canvas.width,canvas.height); c.drawImage(small ? images.small : images.large,0,0);
      canvas.dataset.ready = 'true';
    }).catch(error => { cache.delete(id); canvas.dataset.error = String(error); console.error(error); });
  }
  // The chosen song sheet uses one large prop per song, from the existing sprites.
  const emblems = new Map();
  function paintEmblem(canvas, id) {
    if (!emblems.has(id)) emblems.set(id, (async () => {
      const props={baennorae:['jajin','boat'],wolwol:['wolwol','daljip-0'],kwaeji:['kwaeji','hero-strike'],myeolchi:['myeolchi','net-body'],garae:['garae','garae-planted'],unjae:['unjae','timber'],feast:['kwaeji','lanterns'],geomun:['geomun','boat'],ganggang:['ganggang','ring-a-stand'],punggu:['punggu','furnace'],jajinari:['jajinari','basket'],singosan:['singosan','willow-swing'],dungdang:['dungdang','mulbanggu']};
      const [folder,key]=props[id],response=await fetch(`art/${folder}/sprites.json`);
      if(!response.ok)throw Error(`지도 그림 목록: ${folder}`);
      const meta=await response.json();
      // decode()는 한꺼번에 여럿을 풀 때 EncodingError로 떨어질 수 있다(그래프 검수 8회차 E1, 폰 가로 12건). 그때는 load를 기다린다
      const image=async name=>{const im=new Image();im.src=`art/${folder}/${meta[name+'.png']?.file||name+'.png'}`;await im.decode().catch(()=>im.complete&&im.naturalWidth?0:new Promise((ok,no)=>{im.onload=ok;im.onerror=()=>no(Error(`지도 그림: ${folder}/${name}`));}));return im;};
      const im=await image(key),source=document.createElement('canvas');source.width=im.width;source.height=im.height;
      const g=source.getContext('2d');g.drawImage(im,0,0);const pixels=g.getImageData(0,0,im.width,im.height).data;
      let x=im.width,y=im.height,right=0,bottom=0;
      for(let at=0;at<pixels.length;at+=4)if(pixels[at+3]>100){const n=at/4;x=Math.min(x,n%im.width);y=Math.min(y,Math.floor(n/im.width));right=Math.max(right,n%im.width);bottom=Math.max(bottom,Math.floor(n/im.width));}
      const out=document.createElement('canvas');out.width=80;out.height=45;const c=out.getContext('2d');c.imageSmoothingEnabled=false;
      const scale=Math.min(72/(right-x+1),40/(bottom-y+1)),w=Math.round((right-x+1)*scale),h=Math.round((bottom-y+1)*scale);
      c.drawImage(im,x,y,right-x+1,bottom-y+1,Math.round((80-w)/2),Math.round((45-h)/2),w,h);
      if(id==='ganggang'){
        c.clearRect(0,0,80,45);const actors=await Promise.all(['a','b','c'].map(letter=>image(`ring-${letter}-stand`)));
        for(const [i,[px,py]]of [[22,1],[36,1],[9,13],[49,13],[22,26],[36,26]].entries())c.drawImage(actors[i%3],8,26,30,36,px,py,15,18);
      }
      return out;
    })());
    canvas.width=80;canvas.height=45;canvas.dataset.village=id;canvas.style.imageRendering='pixelated';
    return emblems.get(id).then(image=>{canvas.getContext('2d').drawImage(image,0,0);canvas.dataset.ready='true';}).catch(error=>{emblems.delete(id);canvas.dataset.error=String(error);console.error(error);}); // 실패한 약속은 지워 다음에 다시 받는다
  }
  window.MinyoVillages = { paint, paintEmblem };
})();
