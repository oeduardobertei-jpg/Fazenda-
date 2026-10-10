// QA determinístico da Fazenda Viva: Node.js 20+, sem pacotes externos.
// Executar com: node tests/smoke.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const world=readFileSync(new URL('../world3d.js',import.meta.url),'utf8');
const inline=html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
assert.ok(inline,'script da simulação não encontrado');
assert.doesNotThrow(()=>new Function(inline),'sintaxe JS principal');
const renderer=world.slice(world.indexOf('/* Fazenda Viva'));
assert.ok(renderer.startsWith('/* Fazenda Viva'),'bloco WebGL não encontrado');
assert.doesNotThrow(()=>new Function('THREE',renderer),'sintaxe JS 3D');
const pageVersion=html.match(/FAZENDA VIVA · ([\d.]+)/)?.[1];
const cacheVersion=html.match(/world3d\.js\?v=(\d+)/)?.[1];
assert.ok(pageVersion&&cacheVersion&&
  cacheVersion===pageVersion.replaceAll('.',''),'versão/cache incompatíveis');
const ids='game date money buildings economy status panel actions buyhorse upgrade news pause speed focus map toggle visitFarm viewWorkers workerReport graphicsMode renderMode renderStatus error zoomIn zoomOut resetGame'.split(' ');
const noop=()=>{},ctx=new Proxy({setTransform:noop},{
  get:(o,key)=>o[key]??noop,set:(o,key,v)=>{o[key]=v;return true}
});
const ui=new Map(ids.map(id=>[id,{
  id,textContent:'',hidden:true,style:{},callbacks:{},getContext:()=>ctx,
  addEventListener(name,fn){this.callbacks[name]=fn},
  setPointerCapture:noop,releasePointerCapture:noop,hasPointerCapture:()=>false,
  setAttribute:noop
}]));
let step=()=>{},saved=0,reset=false;
const values={
  window:{},document:{getElementById:id=>{
    assert.ok(ui.has(id),'HTML control ausente: '+id);return ui.get(id);
  }},innerWidth:390,innerHeight:844,devicePixelRatio:2,
  addEventListener:noop,requestAnimationFrame:fn=>step=fn,
  localStorage:{getItem:()=>null,setItem:()=>saved++,removeItem:noop},
  confirm:()=>true,location:{reload:()=>reset=true},
  MutationObserver:class{observe(){}}
};
const old=new Map();
for(const [k,v]of Object.entries(values)){
  old.set(k,globalThis[k]);globalThis[k]=v;
}
try{
  new Function(inline)();
  const get=()=>window.FazendaVivaBridge.state();
  assert.equal(get().day,1,'partida deve começar no dia 1');
  assert.equal(get().farmers.length,15,'15 trabalhadores');
  assert.equal(get().buildings.length,15,'15 estruturas iniciais');
  const initialZoom=get().zoom;
  ui.get('zoomIn').onclick();assert.ok(get().zoom>initialZoom,'zoom +');
  ui.get('zoomOut').onclick();
  ui.get('graphicsMode').onclick();
  assert.equal(get().lowGraphics,true,'modo econômico');
  ui.get('graphicsMode').onclick();
  assert.equal(get().lowGraphics,false,'modo normal');
  ui.get('speed').onclick();ui.get('speed').onclick(); // 8x
  let ms=performance.now(),overlap=0,outside=0,maxSite=0,minHorse=1e9;
  for(let i=0;i<1300;i++){
    ms+=50;step(ms);
    if(i%40!==0)continue;
    const s=get();
    for(const o of s.owners){
      const workers=s.farmers.filter(w=>w.o===o),
        horses=s.horses.filter(h=>h.o===o);
      for(const w of workers){
        if(s.buildings.some(b=>b.o===o&&
            Math.abs(w.x-b.x)<b.w/2+.3&&Math.abs(w.y-b.y)<b.h/2+.3))overlap++;
        if(Math.hypot((w.x-o.x)/110,(w.y-o.y)/107)>1.02)outside++;
      }
      for(let a=0;a<horses.length;a++)for(let b=a+1;b<horses.length;b++){
        minHorse=Math.min(minHorse,Math.hypot(
          horses[a].x-horses[b].x,horses[a].y-horses[b].y
        ));
      }
      maxSite=Math.max(maxSite,
        s.buildings.filter(b=>b.o===o&&b.status!=='complete').length);
    }
  }
  assert.ok(get().day>1,'dias devem avançar');
  assert.ok(get().trails.length>0,'caminhos existentes');
  assert.ok(get().farmers.some(f=>(f.tasksDone||0)>0),'tarefas em execução');
  assert.equal(overlap,0,'NPC não pode atravessar construções');
  assert.equal(outside,0,'NPC não pode sair da gleba');
  assert.ok(minHorse>5.5,'cavalos com distanciamento');
  assert.ok(maxSite<=1,'no máximo uma obra por fazenda');
  assert.equal(saved,0,'sem salvamento automático');
  assert.equal(ui.get('error').textContent,'','sem erros fatais');
  ui.get('resetGame').onclick();
  assert.ok(reset,'reset deve recarregar após confirmação');
  console.log('PASS Fazenda Viva',pageVersion,JSON.stringify({
    dia:get().day,estruturas:get().buildings.length,
    trabalhadores:get().farmers.length,
    tarefas:get().farmers.reduce((sum,f)=>sum+(f.tasksDone||0),0),
    caminhos:get().trails.length,distanciaMinimaCavalos:+minHorse.toFixed(2)
  }));
}finally{
  for(const [k,v]of old)if(v===undefined)delete globalThis[k];else globalThis[k]=v;
}
