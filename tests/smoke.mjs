// QA determinístico da Fazenda Viva: Node.js 20+, sem pacotes externos.
// Executar com: node tests/smoke.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const motion=createRequire(import.meta.url)('../motion.js');
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
// Toda recompensa precisa contribuir para uma progressão alcançável.
const repRewards=[...inline.matchAll(/rep:(\d+),cash:/g)].map(m=>Number(m[1]));
const thresholds=inline.match(/const steps=\[([^\]]+)\]/)?.[1]?.split(',').map(Number);
assert.ok(repRewards.length>=7&&thresholds?.length>=7,
  'progressão/recompensas incompletas');
assert.ok(repRewards.reduce((a,b)=>a+b,0)>=thresholds.at(-1),
  'nível máximo de reputação inalcançável');
const ids='game date money buildings economy status panel actions buyhorse upgrade news pause speed focus map toggle visitFarm viewWorkers workerReport graphicsMode perfMode perfHud renderMode renderStatus error zoomIn zoomOut resetGame manageOpen management manageClose manageTabs manageBody manageQuick panelClose sceneContext contextText contextCancel welcome guideTitle guideText guideHint guideProgress guideNext guideSkip helpOpen'.split(' ');
const noop=()=>{},ctx=new Proxy({setTransform:noop},{
  get:(o,key)=>o[key]??noop,set:(o,key,v)=>{o[key]=v;return true}
});
const ui=new Map(ids.map(id=>[id,{
  id,textContent:'',innerHTML:'',scrollTop:0,hidden:true,style:{},callbacks:{},getContext:()=>ctx,
  querySelectorAll:()=>['resumo','financas','cavalos','equipe','mercado','metas']
    .map(mgtab=>({dataset:{mgtab},setAttribute:noop})),
  addEventListener(name,fn){this.callbacks[name]=fn},
  setPointerCapture:noop,releasePointerCapture:noop,hasPointerCapture:()=>false,
  setAttribute:noop
}]));
let step=()=>{},saved=0,reset=false;
const values={
  window:{FazendaVivaMotion:motion},document:{getElementById:id=>{
    assert.ok(ui.has(id),'HTML control ausente: '+id);return ui.get(id);
  },addEventListener:noop},innerWidth:390,innerHeight:844,devicePixelRatio:2,
  addEventListener:noop,requestAnimationFrame:fn=>step=fn,
  localStorage:{getItem:()=>null,setItem:()=>saved++,removeItem:noop},
  confirm:()=>true,location:{reload:()=>reset=true},
  MutationObserver:class{observe(){}}
  // Temporizadores da interface são isolados neste harness. Não podem
  // sobreviver à restauração de window no bloco finally.
  ,setTimeout:()=>0,clearTimeout:noop
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
  ui.get('helpOpen').onclick();
  assert.equal(ui.get('welcome').hidden,false,'guia pode ser reaberto');
  let guideTime=performance.now();
  for(let i=0;i<100;i++)step(guideTime+=50);
  assert.equal(get().day,1,'tempo fica pausado durante o guia');
  ui.get('guideNext').onclick();ui.get('guideNext').onclick();ui.get('guideNext').onclick();
  assert.equal(ui.get('welcome').hidden,true,'guia concluído libera a partida');
  for(const tree of get().trees){
    assert.ok(!get().owners.some(o=>
      Math.hypot(tree.x-o.x,tree.y-o.y)<139),
      'árvore antiga obstrui a clareira das propriedades');
    assert.ok(!(tree.x>-114&&tree.x<-16&&tree.y>165&&tree.y<263),
      'árvore antiga atravessa a praça regional');
  }
  assert.ok(get().trees.length>450,'mata externa precisa permanecer presente');

  // Projeção de câmera: ao aplicar zoom com âncora fora do centro, a mesma
  // posição do solo precisa permanecer sob o mesmo pixel, também na transição
  // entre câmera próxima e regional.
  const bridge=window.FazendaVivaBridge;
  bridge.mode(true);
  const game=ui.get('game'),anchorPx=277,anchorPy=370;
  function expectAnchor(deltaY){
    const before=bridge.projectedGroundAt(anchorPx,anchorPy);
    game.callbacks.wheel({deltaY,clientX:anchorPx,clientY:anchorPy,
      cancelable:true,preventDefault:noop});
    const after=bridge.projectedGroundAt(anchorPx,anchorPy);
    assert.ok(Math.hypot(before.x-after.x,before.y-after.y)<.01,
      'zoom 3D altera o ponto de terreno sob a âncora');
  }
  expectAnchor(-200);
  expectAnchor(1420); // atravessa o limiar câmera oblíqua -> regional
  expectAnchor(-1200);
  const beforePinch=bridge.projectedGroundAt(180,480);
  const zoomBeforePinch=get().zoom;
  const pointer=(pointerId,x,y)=>({pointerId,pointerType:'touch',
    clientX:x,clientY:y,cancelable:true,preventDefault:noop});
  game.callbacks.pointerdown(pointer(3,140,480));
  game.callbacks.pointerdown(pointer(4,220,480));
  game.callbacks.pointermove(pointer(3,122,480));
  game.callbacks.pointermove(pointer(4,238,480));
  assert.ok(get().zoom>zoomBeforePinch,'pinça de dois dedos deveria ampliar');
  const afterPinch=bridge.projectedGroundAt(180,480);
  assert.ok(Math.hypot(beforePinch.x-afterPinch.x,
    beforePinch.y-afterPinch.y)<.8,
    'pinça simétrica não deve arrastar o chão visivelmente');
  game.callbacks.pointercancel(pointer(3,122,480));
  const zoomAfterCancel=get().zoom;
  game.callbacks.pointermove(pointer(4,238,500));
  assert.equal(get().zoom,zoomAfterCancel,
    'perder captura de um dedo não deve provocar salto de zoom');
  game.callbacks.pointerup(pointer(4,238,500));
  assert.equal(get().cameraGesture,false,'estado do gesto deve terminar');
  bridge.mode(false);
  ui.get('perfMode').onclick();
  assert.equal(ui.get('perfHud').hidden,false,'diagnóstico deve ser opcional');
  assert.ok(ui.get('perfHud').textContent.includes('2D'),
    'diagnóstico apresenta modo de renderização');
  ui.get('perfMode').onclick();
  assert.equal(ui.get('perfHud').hidden,true,'diagnóstico pode ser fechado');

  const ruralProps=get().ranchDecor;
  assert.ok(ruralProps.length>=150,'mata, jardins e adornos devem ocupar as cinco cabanhas');
  for(const owner of get().owners){
    const sites=ruralProps.filter(p=>p.o===owner);
    assert.ok(sites.length>=25,'propriedade precisa de identidade paisagística');
    for(const prop of sites){
      const radius=prop.kind==='arvore'?4.4:prop.kind==='feno'?2.2:
        prop.kind==='pedra'?1.9:1.6;
      assert.ok(!get().buildings.some(b=>b.o===owner&&
        Math.abs(b.x-prop.x)<b.w/2+radius+3.2&&
        Math.abs(b.y-prop.y)<b.h/2+radius+3.2),
      'props de paisagismo não podem atravessar edifícios');
      assert.ok(!get().trails.filter(t=>t.owner===owner.name).some(t=>{
        const dx=t.x2-t.x1,dy=t.y2-t.y1,n=dx*dx+dy*dy||1;
        const ratio=Math.max(0,Math.min(1,
          ((prop.x-t.x1)*dx+(prop.y-t.y1)*dy)/n));
        return Math.hypot(prop.x-t.x1-ratio*dx,
          prop.y-t.y1-ratio*dy)<(t.w||2.5)*.5+radius+1.5;
      }),'paisagismo não pode invadir caminhos');
    }
  }
  assert.equal(get().ranchDecor,ruralProps,'paisagismo em cache durante navegação');

  assert.equal(get().fairground.x,-65,'coordenada da praça de feiras');
  assert.ok(get().regionalOffers.length>=3,'ofertas entre propriedades existentes');
  for(const h of get().horses){
    assert.ok(['velocidade','resistencia','temperamento'].every(t=>
      Number.isFinite(h.genetics?.[t])&&h.genetics[t]>=25&&h.genetics[t]<=99),
      'cavalo precisa de atributos genéticos consistentes');
    const weighted=Math.round(h.genetics.velocidade*.35+
      h.genetics.resistencia*.40+h.genetics.temperamento*.25);
    assert.equal(h.quality,weighted,'qualidade derivada dos atributos');
  }

  // A 0.9 adiciona uma interface de gestão sem comprometer o mundo 3D.
  ui.get('manageOpen').onclick();
  assert.equal(ui.get('management').hidden,false,'painel de gestão abre');
  assert.ok(ui.get('manageBody').innerHTML.includes('Patrimônio'),'resumo econômico visível');
  for(const section of ['resumo','financas','cavalos','equipe','mercado','metas']){
    ui.get('manageTabs').onclick({target:{closest:()=>({dataset:{mgtab:section}})}});
    assert.ok(ui.get('manageBody').innerHTML.length>100,'aba de gestão vazia: '+section);
  }
  assert.ok(ui.get('manageBody').innerHTML.includes('Primeira expansão'),
    'metas de progressão visíveis');
  ui.get('manageTabs').onclick({target:{closest:()=>({dataset:{mgtab:'mercado'}})}});
  assert.ok(ui.get('manageBody').innerHTML.includes('Visitar fazenda'),
    'visita a fazendas disponíveis no Mercado');
  ui.get('manageBody').onclick({target:{closest:()=>({
    dataset:{mgaction:'visitCompetitor',index:'1'}})}});
  assert.equal(ui.get('management').hidden,true,'visita fecha o painel e mostra o mundo');
  assert.equal(get().panX,get().owners[1].x,'visita desloca câmera ao proprietário correto');
  assert.equal(get().panY,get().owners[1].y,'visita desloca câmera ao terreno correto');
  ui.get('manageOpen').onclick();

  // Cliques do painel usam a mesma câmera da simulação, não reiniciam a partida.
  const startCash=get().owners[0].cash;
  ui.get('manageTabs').onclick({target:{closest:()=>({dataset:{mgtab:'cavalos'}})}});
  const sampleHorse=get().horses.find(h=>h.o===get().owners[0]);
  ui.get('manageBody').onclick({target:{closest:()=>({dataset:{mgaction:'findHorse',index:'0'}})}});
  assert.equal(ui.get('management').hidden,true,'localizar cavalo fecha o painel');
  assert.ok(Math.abs(get().panX-sampleHorse.x)<.01,'localizar cavalo ajusta câmera');
  ui.get('manageOpen').onclick();
  ui.get('manageTabs').onclick({target:{closest:()=>({dataset:{mgtab:'equipe'}})}});
  const sampleWorker=get().farmers.filter(w=>w.o===get().owners[0])[1];
  ui.get('manageBody').onclick({target:{closest:()=>({dataset:{mgaction:'findWorker',index:'1'}})}});
  assert.equal(ui.get('management').hidden,true,'localizar trabalhador fecha o painel');
  assert.ok(Math.abs(get().panX-sampleWorker.x)<.01,'localizar NPC ajusta câmera');
  assert.equal(get().owners[0].cash,startCash,'gestão não altera dinheiro ao navegar');
  ui.get('manageOpen').onclick();
  ui.get('manageClose').onclick();
  assert.equal(ui.get('management').hidden,true,'painel de gestão fecha');
  const initialZoom=get().zoom;
  ui.get('zoomIn').onclick();assert.ok(get().zoom>initialZoom,'zoom +');
  ui.get('zoomOut').onclick();
  ui.get('graphicsMode').onclick();
  assert.equal(get().lowGraphics,true,'modo econômico');
  ui.get('graphicsMode').onclick();
  assert.equal(get().lowGraphics,false,'modo normal');
  ui.get('speed').onclick();ui.get('speed').onclick(); // 8x
  let ms=Math.max(performance.now(),guideTime),overlap=0,outside=0,maxSite=0,minHorse=1e9;
  let trailIntersections=0,unconnectedStructures=0,roadSamples=0,landSamples=0,roadMiddle=0,offRoad=0;
  const horseStates=new Set(),workerStates=new Set();
  let joinedRuralEvent=false;
  for(let i=0;i<1300;i++){
    ms+=50;step(ms);
    // Mesmo conjunto de estados usado por Canvas 2D e Three.js, independentemente
    // de qual renderizador esteja ativo no Android.
    const live=get();
    live.horses.forEach(h=>horseStates.add(h.motion));
    live.farmers.forEach(f=>workerStates.add(f.motion));
    if(i%40!==0)continue;
    const s=live;
    if(!joinedRuralEvent&&s.ruralEvent?.id==='insumos'){
      ui.get('manageOpen').onclick();
      ui.get('manageTabs').onclick({target:{closest:()=>({dataset:{mgtab:'mercado'}})}});
      assert.ok(ui.get('manageBody').innerHTML.includes('Central de suprimentos'),
        'evento deve ser exibido no Mercado');
      const input={target:{closest:()=>({dataset:{mgaction:'joinEvent'}})}};
      ui.get('manageBody').onclick(input);
      assert.equal(get().ruralEvent.claimed,true,'participação confirmada');
      const savedCash=get().owners[0].cash;
      ui.get('manageBody').onclick(input);
      assert.equal(get().owners[0].cash,savedCash,'participação não pode ser repetida');
      assert.ok(get().owners[0].supplyCycles>0,'compras coletivas aliviam custos');
      ui.get('manageClose').onclick();
      joinedRuralEvent=true;
    }
    if(i%160===0){
      for(const o of s.owners){
        const roads=s.trails.filter(t=>t.owner===o.name);
        const ready=s.buildings.filter(b=>b.o===o&&b.status!=='building');
        assert.ok(roads.some(t=>t.kind==='entrada'),
          'fazenda sem caminho conectado ao portão: '+o.name);
        for(const b of ready){
          const closest=Math.min(...roads.flatMap(t=>[
            Math.hypot(b.x-t.x1,b.y-t.y1),
            Math.hypot(b.x-t.x2,b.y-t.y2)
          ]));
          if(closest>Math.max(b.w,b.h)*.75+8)unconnectedStructures++;
        }
        for(const t of roads){
          const checks=Math.max(2,Math.ceil(Math.hypot(t.x2-t.x1,t.y2-t.y1)/2.4));
          for(let j=0;j<=checks;j++){
            const r=j/checks,x=t.x1+(t.x2-t.x1)*r,
              y=t.y1+(t.y2-t.y1)*r;
            if(s.buildings.some(b=>b.o===o&&
              Math.abs(x-b.x)<b.w/2+.9&&Math.abs(y-b.y)<b.h/2+.9)){
              trailIntersections++;break;
            }
          }
        }
      }
    }
    for(const o of s.owners){
      const workers=s.farmers.filter(w=>w.o===o),
        horses=s.horses.filter(h=>h.o===o);
      for(const w of workers){
        if(w.pathMode==='rede')roadSamples++;
        if(w.pathMode==='rede'&&w.motion==='walk'&&
           w.routeIndex>0&&w.routeIndex<(w.route?.length||0)-1){
          roadMiddle++;
          const tr=s.trails.filter(t=>t.owner===o.name);
          const nearest=Math.min(...tr.map(t=>{
            const dx=t.x2-t.x1,dy=t.y2-t.y1,n=dx*dx+dy*dy||1;
            const q=Math.max(0,Math.min(1,
              ((w.x-t.x1)*dx+(w.y-t.y1)*dy)/n));
            return Math.hypot(w.x-t.x1-q*dx,w.y-t.y1-q*dy);
          }));
          if(nearest>4.1)offRoad++;
        }
        else if(w.pathMode==='terreno')landSamples++;
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
  assert.ok(joinedRuralEvent,'participação em evento rural não foi exercitada');
  assert.ok(roadSamples>landSamples*2,'funcionários devem usar caminhos');
  assert.ok(roadMiddle>10,'trechos centrais de trilha devem ser utilizados');
  assert.ok(offRoad<=roadMiddle*.1,'funcionários cortando trilhas em excesso');
  const attended=get().horses.filter(h=>(h.careServices||0)>0);
  assert.ok(attended.length>=4,'tratadores devem concluir cuidados em animais reais');
  assert.ok(get().horses.every(h=>Number.isFinite(h.care)&&h.care>=15&&h.care<=100),
    'bem-estar individual deve permanecer dentro dos limites');
  assert.ok(get().careMean.every(v=>v>=0&&v<=100),
    'cuidado médio deve permanecer entre 0 e 100');
  assert.ok(get().farmers.filter(f=>f.role==='tratador').every(f=>
    f.lastHorseName&&f.tasksDone>0),
    'cada tratador deve atender pelo menos um animal');
  assert.ok(get().careJournal.length>=5,'diário de manejo não registra os serviços');
  assert.ok(get().careJournal.every(item=>
    Number.isFinite(item.careGained)&&item.careGained>=14&&
    Number.isFinite(item.day)&&item.horseId>0),
    'diário deve corresponder a cuidados de animais existentes');
  assert.ok(get().farmers.filter(f=>f.role==='tratador').some(f=>
    (f.horseCareJobs||0)>=8),'meta de oito cuidados precisa ser alcançável');

    assert.ok(get().day>1,'dias devem avançar');
  assert.ok(get().trails.length>0,'caminhos existentes');
  assert.ok(get().farmers.some(f=>(f.tasksDone||0)>0),'tarefas em execução');
  assert.equal(overlap,0,'NPC não pode atravessar construções');
  assert.equal(outside,0,'NPC não pode sair da gleba');
  assert.ok(minHorse>5.5,'cavalos com distanciamento');
  assert.equal(trailIntersections,0,'caminhos atravessando edifícios');
  assert.equal(unconnectedStructures,0,'estrutura sem conexão à malha de circulação');
  assert.ok(['idle','walk','graze'].every(s=>horseStates.has(s)),
    'estados do cavalo não alternaram entre descanso, passo e pasto');
  assert.ok(['walk','work'].every(s=>workerStates.has(s)),
    'trabalhadores não alternaram entre caminhar e executar tarefas');
  assert.ok(maxSite<=1,'no máximo uma obra por fazenda');
  assert.equal(saved,0,'sem salvamento automático');
  ui.get('manageOpen').onclick();
  ui.get('manageTabs').onclick({target:{closest:()=>({dataset:{mgtab:'cavalos'}})}});
  assert.ok(ui.get('manageBody').innerHTML.includes('Cuidado médio do plantel'),
    'gestão mostra o bem-estar animal');
  assert.ok(ui.get('manageBody').innerHTML.includes('Diário de manejo'),
    'painel não apresenta os cuidados concluídos');
  assert.ok(ui.get('manageBody').innerHTML.includes('Ração de qualidade'),
    'gestão oferece estoque de ração especial');
  const careOwner=get().owners[0],moneyBeforeCare=careOwner.cash;
  ui.get('manageBody').onclick({target:{closest:()=>({dataset:{mgaction:'buyCareFeed'}})}});
  assert.equal(careOwner.cash,moneyBeforeCare-200,'ração tem custo efetivo no caixa');
  assert.equal(careOwner.feedStock,4,'compra acrescenta quatro porções');
  ui.get('manageBody').onclick({target:{closest:()=>({dataset:{mgaction:'watchCare'}})}});
  assert.equal(ui.get('management').hidden,true,'acompanhar manejo fecha gestão');
  assert.ok(get().zoom>3,'modo de acompanhamento aproxima câmera');
  let stepsToTreatment=0;
  while(careOwner.feedStock===4&&stepsToTreatment++<600){ms+=50;step(ms)}
  assert.ok(careOwner.feedStock<4,
    'ração reforçada deve ser consumida apenas em serviço realmente concluído');
  assert.ok(get().horses.some(h=>h.o===careOwner&&
    h.careSpecialUntil!==undefined),'trato reforçado deve ativar um efeito no animal');
  ui.get('manageOpen').onclick();
  ui.get('manageTabs').onclick({target:{closest:()=>({dataset:{mgtab:'financas'}})}});
  assert.ok(ui.get('manageBody').innerHTML.includes('Evolução do saldo'),
    'relatório financeiro após simulação');
  ui.get('manageTabs').onclick({target:{closest:()=>({dataset:{mgtab:'metas'}})}});
  assert.ok(ui.get('manageBody').innerHTML.includes('Concluída'),
    'recompensas por metas concluídas');
  // A primeira implementação de linhagem deve efetivamente gerar descendentes,
  // não apenas mostrar botões no painel de controle.
  ui.get('manageTabs').onclick({target:{closest:()=>({dataset:{mgtab:'cavalos'}})}});
  const player=get().owners[0];
  const stable=get().buildings.find(b=>b.o===player&&b.type==='stable');
  stable.tier=3;
  const frozenDay=get().day;
  for(let k=0;k<40;k++){ms+=50;step(ms)}
  assert.equal(get().day,frozenDay,'jogo deve pausar durante gestão mobile');
  ui.get('manageClose').onclick();
  for(let k=0;k<25;k++){ms+=50;step(ms)}
  ui.get('manageOpen').onclick();
  ui.get('manageTabs').onclick({target:{closest:()=>({dataset:{mgtab:'cavalos'}})}});
  const originalHerd=get().horses.filter(h=>h.o===player).length;
  const cashBefore=player.cash;
  ui.get('manageBody').onclick({target:{closest:()=>({dataset:{mgaction:'breedHorse'}})}});
  assert.equal(get().pregnancies.length,1,'reprodução registra uma gestação');
  assert.equal(player.cash,cashBefore-850,'reprodução cobra a taxa prevista');
  const pending=get().pregnancies[0],due=pending.dueDay;
  const mareIndex=get().horses.filter(h=>h.o===player)
    .findIndex(h=>h.id===pending.motherId);
  const herdDuringGestation=get().horses.filter(h=>h.o===player).length;
  ui.get('manageBody').onclick({target:{closest:()=>({
    dataset:{mgaction:'sellHorse',index:String(mareIndex)}})}});
  assert.equal(get().horses.filter(h=>h.o===player).length,herdDuringGestation,
    'égua gestante não pode ser vendida');

  ui.get('manageBody').onclick({target:{closest:()=>({dataset:{mgaction:'breedHorse'}})}});
  assert.equal(get().pregnancies.length,1,'não duplicar gestação');
  assert.equal(player.cash,cashBefore-850,'não cobrar taxa em tentativa bloqueada');
  ui.get('manageClose').onclick();
  let advance=0;
  while(get().day<due&&advance++<1500){ms+=50;step(ms)}
  ui.get('manageOpen').onclick();
  ui.get('manageTabs').onclick({target:{closest:()=>({dataset:{mgtab:'cavalos'}})}});
  assert.ok(get().horses.filter(h=>h.o===player).length>originalHerd,
    'potro nasce ao final da gestação');
  const foal=get().horses.find(h=>h.motherId===pending.motherId);
  assert.ok(foal&&foal.age===0&&foal.fatherId===pending.fatherId,
    'identidade genética e idade inicial do potro');
  assert.ok(foal.quality>=25&&foal.quality<=99,'qualidade genética limitada');
  assert.ok(['velocidade','resistencia','temperamento'].every(t=>
      Number.isFinite(foal.genetics[t])),'potro herda três aptidões');
  const foalIndex=get().horses.filter(h=>h.o===player)
    .findIndex(h=>h.id===foal.id);
  const beforeSale=player.cash;
  ui.get('manageBody').onclick({target:{closest:()=>({
    dataset:{mgaction:'sellHorse',index:String(foalIndex)}})}});
  assert.ok(!get().horses.some(h=>h.id===foal.id),'venda remove animal');
  assert.ok(player.cash>beforeSale,'venda credita saldo positivo');

  ui.get('manageTabs').onclick({target:{closest:()=>({dataset:{mgtab:'mercado'}})}});
  assert.ok(ui.get('manageBody').innerHTML.includes('Agenda regional'),
    'mercado descreve eventos');
  assert.ok(get().ruralEventHistory.length>=1,'calendário rural apresenta eventos');
  const offers=get().regionalOffers;
  assert.ok(offers.length>=1,'ao menos uma oferta regional disponível');
  const offer=offers[0],ownerCash=player.cash,sellerCash=offer.seller.cash;
  const sellerHerd=get().horses.filter(h=>h.o===offer.seller).length;
  ui.get('manageBody').onclick({target:{closest:()=>({
    dataset:{mgaction:'buyRegional',id:String(offer.horse.id)}})}});
  assert.equal(offer.horse.o,player,'negociação deve transferir cavalo real');
  assert.equal(player.cash,ownerCash-offer.price,'pagamento integral ao vendedor');
  assert.equal(offer.seller.cash,sellerCash+offer.price,'receita do proprietário vendedor');
  assert.equal(get().horses.filter(h=>h.o===offer.seller).length,
    sellerHerd-1,'vendedor reduz seu plantel');
  assert.ok(!get().regionalOffers.some(x=>x.horse.id===offer.horse.id),
    'oferta não pode ser comprada duas vezes');
  assert.ok(get().regionalTradeHistory.some(x=>x.name===offer.horse.name),
    'histórico de negociações atualizado');
  // Comprar um cavalo já existente também deve movê-lo fisicamente.
  // Na 0.9.4 a troca de proprietário não invalidava o cache de piquetes.
  ui.get('manageClose').onclick();
  for(let i=0;i<10;i++){ms+=50;step(ms)}
  assert.ok(Math.hypot(offer.horse.x-player.x,offer.horse.y-player.y)<113,
    'cavalo negociado ficou na cabanha anterior em vez de migrar');
  assert.ok(Math.hypot(offer.horse.x-offer.seller.x,
    offer.horse.y-offer.seller.y)>100,
    'cavalo vendido não pode continuar fisicamente na propriedade vendedora');
  ui.get('manageOpen').onclick();


  ui.get('manageClose').onclick();
  assert.equal(ui.get('error').textContent,'','sem erros fatais');
  ui.get('resetGame').onclick();
  assert.ok(reset,'reset deve recarregar após confirmação');
  console.log('PASS Fazenda Viva',pageVersion,JSON.stringify({
    dia:get().day,estruturas:get().buildings.length,
    trabalhadores:get().farmers.length,
    tarefas:get().farmers.reduce((sum,f)=>sum+(f.tasksDone||0),0),
    caminhos:get().trails.length,distanciaMinimaCavalos:+minHorse.toFixed(2),
    intersecoesDeCaminhos:trailIntersections,
    estadosCavalos:[...horseStates],estadosTrabalhadores:[...workerStates]
  }));
}finally{
  for(const [k,v]of old)if(v===undefined)delete globalThis[k];else globalThis[k]=v;
}
