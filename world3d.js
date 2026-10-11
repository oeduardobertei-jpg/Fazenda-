// Versão fixa, com espelho caso o CDN principal esteja indisponível.
let THREE;
try {
  THREE=await import('https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js');
} catch (err) {
  THREE=await import('https://unpkg.com/three@0.165.0/build/three.module.js');
}

/* Fazenda Viva 0.9.7 — manejo animal visível, cuidado equino e integração 2D/3D.
 * O Canvas 2D continua funcionando caso import/WebGL falhe.
 * Controles, economia e reinício de partidas permanecem no index.html.
 */
window.FazendaViva3DReady=true;
const api = window.FazendaVivaBridge;
if (!api) throw Error('Simulação principal indisponível');
const btn = document.getElementById('renderMode');
const fail = document.getElementById('renderStatus');
let renderer, scene, camera, content, horseLayer, workerLayer, trailLayer, grassLayer, fairLayer, ranchLayer;
let enabled = false, detailMode=null, trailStamp3D='', grassStamp3D='';
const modelsByBuilding=new Map();
let lastTrailObject=null,lastTrailLength=-1,lastGrassBuildings=-1,lastGrassTrails=null;
let workerLabels=[],last3DWorkersShown=0,appliedLowGraphics=null;
let smoothCenter=new THREE.Vector3(),cameraInitialized=false,lastFrameAt=0;
let renderGeneration=0,contextInterrupted=false;
let resolutionScale=1,appliedDpr=0,frameTotal=0,frameCount=0;
let slowWindows=0,fastWindows=0,lastFrameReport=0,frameWindowTime=0;
function applyAdaptiveResolution(isEco=false,force=false){
  if(!renderer)return;
  const cap=innerWidth<=620?(isEco?.85:1.2):(isEco?1:1.5);
  const requested=Math.max(.62,Math.min(devicePixelRatio||1,cap*resolutionScale));
  if(force||!appliedDpr||Math.abs(requested-appliedDpr)>.035){
    renderer.setPixelRatio(requested);
    renderer.setSize(innerWidth,innerHeight);
    appliedDpr=requested;
  }
}
function recordFrameTime(delta){
  // O intervalo inclui limitação de FPS, mas descarta abas em segundo plano.
  if(delta<6||delta>180)return;
  frameTotal+=delta;frameCount++;
  if(frameCount<32)return;
  const mean=frameTotal/frameCount;
  frameCount=0;frameTotal=0;
  slowWindows=mean>52?slowWindows+1:0;
  fastWindows=mean<38?fastWindows+1:0;
  if(slowWindows>=3){
    resolutionScale=Math.max(.70,Math.round((resolutionScale-.10)*100)/100);
    slowWindows=0;fastWindows=0;
  }else if(fastWindows>=8){
    resolutionScale=Math.min(1,Math.round((resolutionScale+.05)*100)/100);
    fastWindows=0;
  }
}
const groundRay=new THREE.Raycaster(), groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0), groundHit=new THREE.Vector3();
let labelLayer, labelNodes = [], fairLabel=null, lastFairStamp='', lastRanchDecor=null, lastDecorEco=null;
const colors = {
  grass: 0x89a970, grass2: 0x9bb97b, earth: 0xb8a17a,
  fence: 0xc9a775, timber: 0x806042, path: 0xc5aa86,
  water: 0x629ba1, crop: 0xb0a76c, tree: 0x487c40
};
const materials = new Map(),geoBoxes=new Map(),geoRoofs=new Map();
function sharedBox(w,h,d){
  const key=[w,h,d].map(n=>Number(n).toFixed(3)).join('/');
  if(!geoBoxes.has(key))geoBoxes.set(key,new THREE.BoxGeometry(w,h,d));
  return geoBoxes.get(key);
}
const PALETTE={
  plaster:0xe0c9a7,offwhite:0xe8dfc5,teal:0x598e88,
  wood:0x856341,dark:0x634b36,lightWood:0xc69e71,
  tile:0xa44f39,tile2:0x975e46,metal:0x727d7c,
  straw:0xc4ac68,window:0x7ba9a5,frame:0xf1dfb8
};
function truss(g,x,y,z,w,h){
  box(g,w,.24,.24,x,y,z,PALETTE.dark);
  box(g,.22,h,.24,x-w*.5+.13,y-h*.5,z,PALETTE.dark);
  box(g,.22,h,.24,x+w*.5-.13,y-h*.5,z,PALETTE.dark);
}
function stableCross(g,x,y,z,width,height){
  const len=Math.hypot(width,height);
  for(const k of [-1,1]){
    const beam=box(g,.22,len,.22,x,y,z,PALETTE.lightWood);
    beam.rotation.z=k*Math.atan2(width,height);
  }
}
function mat(color, roughness=1) {
  const key = String(color)+':'+roughness;
  if (!materials.has(key)) materials.set(key,new THREE.MeshLambertMaterial({color,side:THREE.DoubleSide}));
  return materials.get(key);
}
function box(parent,w,h,d,x,y,z,color) {
  const m = new THREE.Mesh(sharedBox(w,h,d),mat(color));
  m.position.set(x,y,z);parent.add(m);return m;
}
function flat(parent,w,d,x,z,color,y=.16) {
  return box(parent,w,.13,d,x,y,z,color);
}
function cylinder(parent,rTop,rBottom,h,x,y,z,color,segments=7) {
  const geo=new THREE.CylinderGeometry(rTop,rBottom,h,segments);
  geo.__fvTransient=true;
  const m=new THREE.Mesh(geo,mat(color));
  m.position.set(x,y,z);parent.add(m);return m;
}
function disposeTransientGroup(obj){
  const children=[...obj.children||[]];
  for(const child of children)disposeTransientGroup(child);
  if(obj.geometry?.__fvTransient)obj.geometry.dispose?.();
  // Materiais, boxes e telhados pertencem aos caches compartilhados.
}
function ellipse(parent,x,z,rx,rz,color,elevation=.09) {
  // Paisagem em níveis físicos distintos: evita z-fighting (triângulos/radiais nos açudes).
  const m=new THREE.Mesh(new THREE.CircleGeometry(1,48),mat(color));
  m.rotation.x=-Math.PI/2;
  m.position.set(x,elevation,z);
  m.scale.set(rx,rz,1);
  m.renderOrder=Math.round(elevation*100);
  parent.add(m);
  return m;
}
function road(parent,x1,z1,x2,z2,width=9,elevation=.16) {
  // Estradas que se cruzam usam alturas diferentes: evita z-fighting em zoom elevado.
  const dx=x2-x1,dz=z2-z1,dist=Math.hypot(dx,dz);
  const m=flat(parent,width,dist,(x1+x2)/2,(z1+z2)/2,colors.path,elevation);
  m.rotation.y=Math.atan2(dx,dz);
  return m;
}
function roof(parent,w,d,h,ridgeY,color) {
  const key=[w,d,h,ridgeY].map(x=>Number(x).toFixed(3)).join(':');
  let item=geoRoofs.get(key);
  if(!item){
    const verts = new Float32Array([
      -w/2,h,-d/2, w/2,h,-d/2, -w/2,ridgeY,0,
      w/2,h,-d/2, w/2,ridgeY,0, -w/2,ridgeY,0,
      -w/2,ridgeY,0, w/2,ridgeY,0, -w/2,h,d/2,
      w/2,ridgeY,0, w/2,h,d/2, -w/2,h,d/2
    ]);
    const main=new THREE.BufferGeometry();
    main.setAttribute('position',new THREE.BufferAttribute(verts,3));
    main.computeVertexNormals();
    const ends=[];
    for(const sign of [-1,1]){
      // Cumeeira ao longo do eixo X: oitões ficam nas extremidades X, não nos beirais Z.
      // O esquema anterior cruzava o próprio telhado e gerava triângulos em zoom alto.
      const x=sign*w/2,tri=new THREE.BufferGeometry();
      tri.setAttribute('position',new THREE.Float32BufferAttribute([
        x,h,-d/2, x,h,d/2, x,ridgeY,0
      ],3));
      tri.computeVertexNormals();
      ends.push(tri);
    }
    item={main,ends};geoRoofs.set(key,item);
  }
  parent.add(new THREE.Mesh(item.main,mat(color)));
  for(const geom of item.ends)parent.add(new THREE.Mesh(geom,mat(color)));
}
function rails(parent,w,d,color=colors.fence,y=1.4) {
  const sx=[-w/2,w/2],sz=[-d/2,d/2];
  for(let x of sx) for(let z of sz) box(parent,.6,2.4,.6,x,1.2,z,color);
  for(let z of sz){
    box(parent,w, .36,.35,0,y,z,color);
    box(parent,w,.3,.35,0,y*.48,z,color);
  }
  for(let x of sx){
    box(parent,.35,.36,d,x,y,0,color);
    box(parent,.35,.3,d,x,y*.48,0,color);
  }
}
function building(b,detail=true){
  const group=new THREE.Group();group.position.set(b.x,0,b.y);
  const w=b.w,d=b.h,t=Math.max(1,Math.min(3,b.tier||1));
  const progress=Math.max(0,Math.min(100,b.progress??100));
  if(b.status==='building'){
    // Uma obra visível por propriedade: terraplenagem -> pilares -> travamentos -> telhado.
    flat(group,w-.5,d-.5,0,0,0xa68b68,.30);
    flat(group,w-.9,d-.9,0,0,0xd0b58c,.39);
    const posts=[[-w*.43,-d*.40],[w*.43,-d*.40],[-w*.43,d*.40],[w*.43,d*.40]];
    posts.forEach(([x,z],i)=>{
      if(progress>=i*20){
        box(group,.38,2.7,.38,x,1.45,z,0x806247);
        if(progress>55)box(group,w*.83,.20,.20,0,2.8,z,0x95714c);
      }
    });
    if(progress>=70)box(group,w*.68,.18,d*.70,0,3.1,0,0xc39861);
    if(detail){
      box(group,2.5,1,1.2,-w*.25,.64,d*.12,0xbe9867);
      box(group,2.1,.25,1.1,w*.26,.38,-d*.2,0x806247);
      // Progresso materializado em tábuas no chão, nunca vários lotes preparatórios vazios.
      flat(group,(w-2)*Math.max(.1,progress/100),.45,-(w-2)*(1-progress/100)/2,-d*.36,0xe0c76d,.51);
    }
    group.userData.building=b;
    return group;
  }
  const variety=(Math.abs(Math.round(b.x*17+b.y*23+((b.o?.style?.roof||0)%17)))%5);
  if(b.type==='paddock'){
    flat(group,w-.6,d-.6,0,0,variety%2?0x78a05a:0x85a963,.28);
    rails(group,w-.7,d-.7,PALETTE.lightWood);
    if(!detail){
      // Mesmo na visão regional, o piquete CONCLUÍDO não parece uma obra vazia.
      box(group,2.2,.75,1.3,-w*.23,.56,d*.17,0xc1a068);
      box(group,2.7,.55,1.1,w*.21,.58,-d*.23,0x5e929b);
    }
    if(detail){
      // Um piquete CONCLUÍDO contém abrigo, bebedouro, cocho e capim — não é um canteiro de obras.
      flat(group,w*.78,d*.73,0,0,variety%2?0x84ac65:0x79a35c,.33);
      box(group,2.2,.72,.95,-w*.27,.65,d*.24,0x98734f);
      box(group,2.6,.45,1,w*.25,.67,-d*.29,0x638f9c);
      // Abrigo simples no canto, dentro do espaço cercado.
      const sx=w*.29,sz=d*.22;
      for(const x of [sx-2.5,sx+2.5])for(const z of [sz-1.6,sz+1.6])
        box(group,.23,2.35,.23,x,1.2,z,0xaa8256);
      box(group,5.8,.25,4.0,sx,2.46,sz,0xa2764d);
      for(let i=0;i<7;i++){
        const x=-w*.30+(i%4)*1.7,z=-d*.21+Math.floor(i/4)*3.4;
        cylinder(group,.28,.45,.7,x,.52,z,0x658f48,5);
      }
      // Fardos e pilhas de material funcional de manejo.
      cylinder(group,.9,1.0,.68,-w*.24,.53,-d*.26,0xc4ad69,8);
      cylinder(group,.9,1.0,.68,-w*.11,.53,-d*.26,0xbca05d,8);
    }
    group.userData.building=b;return group;
  }
  const usedW=Math.min(w-.45,w*(.54+.22*(t-1)));
  const usedD=d-.55;
  const height=b.type==='barn'?6.7:b.type==='stable'?5.5:5.8;
  const facade=b.type==='house'?(b.o.style?.wall??PALETTE.offwhite):
               b.type==='stable'?([0xcdb796,0xc0bca0,0xcebfa9,0xb8ac8a,0xc9c2ac][variety]):
               ([0xb4beb4,0xb7b7a5,0xb4b5aa,0xa8b3a5,0xb9c0af][variety]);
  const roofColor=b.type==='house'?(b.o.style?.roof??PALETTE.tile):
                  b.type==='stable'?([0x79543e,0x785944,0x6d5444,0x866146,0x675441][variety]):
                  ([PALETTE.metal,0x707d72,0x8a8877,0x687777,0x7b8079][variety]);
  const zFront=usedD*.50;
  flat(group,w-.1,d-.1,0,0,variety%2===0?0xbca17c:0xa8987f,.28);
  // Plataforma e edifício contidos integralmente no lote: nenhum telhado ultrapassa o footprint.
  box(group,usedW,height,usedD*.88,0,height*.5,-.2,facade);
  const ridge=height+(b.type==='house'?2.9:2.0);
  roof(group,usedW+.25,usedD*.99,height,ridge,roofColor);
  if(detail){
    // Bordas do telhado e cumeeira unem visualmente os telhados aos volumes.
    const trim=b.type==='barn'?0x858783:PALETTE.lightWood;
    box(group,usedW*.93,.17,.24,0,ridge+.06,0,roofColor);
    for(const z of [-usedD*.485,usedD*.485]){
      box(group,usedW+.18,.16,.22,0,height+.10,z,trim);
    }
  }
  if(!detail){group.userData.building=b;return group}
  const front=usedD*.44;
  if(b.type==='house'){
    // Porta principal, janelas com molduras e varanda coberta típica de sede rural.
    box(group,1.7,3.35,.27,0,1.68,front+.02,PALETTE.dark);
    box(group,.27,3.35,.30,-.85,1.68,front+.1,PALETTE.frame);
    box(group,.27,3.35,.30,.85,1.68,front+.1,PALETTE.frame);
    box(group,usedW*.63,.18,1.3,0,.21,front+.6,PALETTE.lightWood);
    for(const side of [-1,1]){
      const windowX=side*usedW*.31;
      box(group,1.75,1.65,.16,windowX,height*.60,front+.11,PALETTE.window);
      box(group,.18,2.02,.28,windowX,height*.60,front+.24,PALETTE.frame);
      box(group,2.1,.18,.28,windowX,height*.60,front+.24,PALETTE.frame);
      box(group,2.1,.18,.28,windowX,height*.60+.95,front+.24,PALETTE.frame);
      box(group,2.1,.18,.28,windowX,height*.60-.95,front+.24,PALETTE.frame);
    }
    // Pergolado frontal dentro do próprio lote, com pilares e floreiras.
    for(const side of [-1,1]){
      const x=side*(usedW*.43);
      box(group,.30,2.5,.3,x,1.28,front+.82,PALETTE.lightWood);
      cylinder(group,.55,.62,.64,x,.42,front+.81,0x967e5e,7);
    }
    box(group,usedW*.95,.35,.35,0,2.50,front+.83,PALETTE.lightWood);
    // Chaminé revestida e floreiras: casa com assinatura rural própria.
    const chimneyX=-usedW*.25;
    box(group,.93,2.8,.93,chimneyX,height+1.85,-usedD*.15,0xa78971);
    box(group,1.17,.26,1.17,chimneyX,height+3.28,-usedD*.15,0x765d52);
    for(const sign of [-1,1]){
      const bx=sign*usedW*.34,bz=front+.48;
      box(group,1.45,.54,.62,bx,.47,bz,0xb27d56);
      cylinder(group,.35,.45,.60,bx-.28,.89,bz,0x63944d,6);
      cylinder(group,.33,.42,.55,bx+.27,.87,bz,0x608b50,6);
      for(const x of [bx-.30,bx+.28]){
        cylinder(group,.17,.17,.16,x,1.24,bz,
          variety%2===0?0xe5bd73:0xd27c73,7);
      }
    }
    // Insígnia de cada cabanha no alpendre. A cor identifica o proprietário.
    box(group,usedW*.25,.36,.16,usedW*.20,2.40,front+1.01,b.o.color);
    if(t>=2){
      for(const side of [-1,1])
        box(group,.20,1.60,.20,side*usedW*.43,1.18,front+.80,0xe2c89b);
    }
  }else if(b.type==='stable'){
    // Aberturas reais de baias com portões de madeira e separação física.
    const count=Math.min(t+2,4);
    const step=usedW/count;
    for(let i=0;i<count;i++){
      const x=-usedW/2+step*(i+.5);
      box(group,step*.78,2.55,.17,x,1.30,front+.09,0x594c3c);
      box(group,step*.73,1.36,.19,x,.70,front+.2,PALETTE.wood);
      box(group,step*.72,.18,.24,x,1.45,front+.24,PALETTE.lightWood);
      box(group,.17,2.65,.23,x-step*.42,1.32,front+.22,PALETTE.lightWood);
      box(group,.17,2.65,.23,x+step*.42,1.32,front+.22,PALETTE.lightWood);
      stableCross(group,x,.68,front+.35,step*.45,.89);
    }
    // Ripado superior para ventilação permanente.
    for(let i=0;i<Math.max(4,Math.floor(usedW/2));i++){
      const x=-usedW/2+1+i*(usedW-2)/Math.max(3,Math.floor(usedW/2)-1);
      box(group,.42,.92,.17,x,4.25,front+.12,0x514539);
    }
    box(group,usedW,.28,.36,0,height*.91,front+.15,PALETTE.lightWood);
    // Letreiro de propriedade, janelas laterais e pequenos acabamentos variam por cocheira.
    box(group,Math.min(3.8,usedW*.32),.43,.19,0,height*.87,front+.35,b.o.color);
    for(const sign of [-1,1]){
      const x=sign*(usedW*.44);
      box(group,.45,1.05,.20,x,height*.53,front+.27,0x627e79);
      box(group,.49,.15,.24,x,height*.82,front+.30,PALETTE.lightWood);
    }
    // Respiro na cumeeira, fardos, armário de arreios e indicação de baias.
    for(let j=0;j<Math.min(t+1,3);j++){
      const sx=-usedW*.25+j*usedW*.23;
      cylinder(group,.48,.58,.42,sx,ridge+.22,0,0x6b5b48,7);
    }
    for(const sx of [-usedW*.44,usedW*.44]){
      cylinder(group,.61,.73,.71,sx,.54,front+.31,0xc4ae6e,8);
      box(group,.21,.87,.24,sx,1.25,front+.36,0x6c5540);
    }
    if(t>=2){
      box(group,2.9,.22,.6,usedW*.29,3.77,front+.30,0xd3b17d);
      box(group,2.3,.20,.47,usedW*.29,3.40,front+.46,0x8a6646);
    }
  }else{
    // Galpão agrícola: portões duplos, ripas metálicas e pequenas janelas de ventilação.
    const doorWidth=Math.min(usedW*.67,7.8);
    box(group,doorWidth*.49,height*.69,.27,-doorWidth*.255,height*.35,front+.08,0x747d78);
    box(group,doorWidth*.49,height*.69,.27,doorWidth*.255,height*.35,front+.08,0x69756f);
    for(let k=-2;k<=2;k++){
      const x=k*doorWidth*.12;
      box(group,.09,height*.65,.3,x,height*.35,front+.20,0x929c94);
    }
    for(const x of [-usedW*.43,usedW*.43]){
      box(group,.34,height*.95,.3,x,height*.49,front+.18,PALETTE.dark);
      box(group,.9,.85,.24,x,height*.72,front+.23,0x424e4b);
    }
    box(group,usedW+.18,.4,.5,0,height*.91,front+.16,0x6e756d);
    // Lanternim alto, importante na arquitetura de galpões ventilados.
    for(let i=0;i<3;i++){
      const x=-usedW*.24+i*usedW*.24;
      box(group,.70,.38,.25,x,height*.92,front+.23,0x4b5f5c);
    }
    // Silos verticais modestos dentro do lote, sem invadir a circulação externa.
    const siloX=Math.min(w*.40,w*.5-1.52);
    cylinder(group,1.10,1.13,7.10,siloX,3.70,-d*.24,0xa0a8a0,9);
    cylinder(group,.14,1.15,1.38,siloX,7.92,-d*.24,0x7b8983,9);
    for(let i=0;i<4;i++)
      box(group,.12,.16,.28,siloX+1.13,.95+i*1.42,-d*.24,0xcfd3c0);
    // Pilhas paletizadas e sacarias remetem a uma operação agrícola real.
    for(let k=0;k<(t>=2?3:2);k++){
      box(group,1.12,.74,.83,-w*.36+k*1.32,.69,front+.36,0x987a56);
      box(group,1.16,.15,.87,-w*.36+k*1.32,1.14,front+.36,0xd2b582);
    }
  }
  // Ampliações físicas ocorrem dentro da reserva original (níveis 2 e 3).
  if(t>1)for(let j=0;j<t-1;j++){
    const x=usedW*.5-1.1-j*1.4;
    box(group,.30,2.5,.32,x,1.25,front+.19,PALETTE.lightWood);
  }
  if(b.status==='upgrading'){
    // Estrutura atual continua de pé enquanto ocorre uma ampliação localizada.
    for(const sign of [-1,1]){
      const px=sign*(w*.48);
      box(group,.20,Math.min(5,height),.20,px,Math.min(5,height)/2,0,0xd1aa73);
      box(group,.18,.22,d*.75,px,2.5,0,0xc69d63);
    }
    box(group,w*.6,.20,.24,0,height*.80,usedD*.50,0xdebd7e);
  }
  group.userData.building=b;return group;
}
// Sombras estilizadas de contato: malha compartilhada, sem shadow maps caros
// ou múltiplas fontes de luz, apropriada para WebGL em aparelhos modestos.
let contactGeo=null,contactMat=null;
function contactShadow(parent,rx,rz){
  if(!contactGeo)contactGeo=new THREE.CircleGeometry(1,16);
  if(!contactMat)contactMat=new THREE.MeshBasicMaterial({
    color:0x243926,side:THREE.DoubleSide,transparent:true,
    opacity:.16,depthWrite:false});
  const mesh=new THREE.Mesh(contactGeo,contactMat);
  mesh.rotation.x=-Math.PI/2;
  mesh.position.set(0,.025,0);
  mesh.scale.set(rx,rz,1);
  parent.add(mesh);
  return mesh;
}
// Os pivôs ficam na articulação, não no centro das caixas. A fase da passada
// vem da distância realmente percorrida na simulação (mesma fonte do 2D).
function makeHorse(h){
  const group=new THREE.Group(),coat=mat(h.coat||0x81553d);
  contactShadow(group,2.8,1.4);
  const part=(parent,w,y,d,x,py,z)=>{
    const mesh=new THREE.Mesh(sharedBox(w,y,d),coat);
    mesh.position.set(x,py,z);parent.add(mesh);return mesh;
  };
  part(group,3.8,1.5,1.4,0,2.3,0);
  // Peito e garupa dão uma silhueta equestre mais identificável sem esqueleto pesado.
  part(group,.94,1.62,1.33,1.22,2.26,0);
  part(group,1.22,1.61,1.43,-1.18,2.26,0);
  box(group,2.25,.11,1.16,-.18,3.12,0,0x9e8060);
  const neckPivot=new THREE.Group();
  neckPivot.position.set(1.45,2.85,0);group.add(neckPivot);
  part(neckPivot,1.12,1.84,1.0,0,.20,-.05);
  part(neckPivot,1.19,.9,1.1,.40,.95,0);
  box(neckPivot,.20,1.2,.72,-.10,.7,-.07,0x48372e);
  // Olhos e focinho tornam o movimento do pescoço perceptível de lado.
  box(neckPivot,.32,.31,.83,1.02,.79,0,0xa38c75);
  for(const side of [-1,1]){
    box(neckPivot,.13,.15,.10,.79,1.12,side*.58,0x2f251f);
    box(neckPivot,.16,.11,.10,1.16,.70,side*.43,0x43352f);
    box(neckPivot,.23,.55,.23,.60,1.50,side*.27,0x4f3b31);
  }
  for(let i=0;i<4;i++)
    box(neckPivot,.27,.25,.52,-.52,.90-i*.31,-.03,0x493b31);
  const legs=[];
  for(const x of [-1.25,1.25])for(const z of [-.48,.48]){
    const pivot=new THREE.Group();
    pivot.position.set(x,1.68,z);group.add(pivot);
    part(pivot,.35,1.55,.32,0,-.75,0);
    box(pivot,.43,.28,.40,.08,-1.47,.06,0x5d4c3e);
    legs.push(pivot);
  }
  const tailPivot=new THREE.Group();
  tailPivot.position.set(-2.0,2.58,0);group.add(tailPivot);
  box(tailPivot,.37,1.2,.4,-.12,-.58,0,0x49382c);
  // Variação discreta por indivíduo, mas mantém a leitura das pelagens em zoom.
  if(h.id%4===0){
    box(group,.46,.16,1.12,.58,3.10,0,0xcbb897);
  }
  // Sinal de trato: flutua acima do animal somente durante/recentemente
  // após o serviço realizado por um trabalhador desta mesma fazenda.
  const careFx=new THREE.Group();
  careFx.position.set(0,5.1,0);
  box(careFx,.72,.72,.23,-.34,.05,0,0x9ed4a9);
  box(careFx,.72,.72,.23,.34,.05,0,0x9ed4a9);
  box(careFx,.88,.79,.21,0,-.34,0,0x7dbf8c).rotation.z=Math.PI/4;
  box(careFx,.20,.56,.16,.08,-1.04,.01,0xe4e3ad);
  const special=new THREE.Group();
  for(const side of [-1,1]){
    const leaf=box(special,.24,.64,.10,side*.55,.22,.20,0xe2c16b);
    leaf.rotation.z=side*.43;
  }
  box(special,.10,.55,.09,0,-.32,.20,0x789956);
  special.visible=false;careFx.add(special);
  careFx.visible=false;
  group.add(careFx);
  group.userData.careFx=careFx;
  group.userData.specialCareFx=special;
  group.userData.horse=h;
  group.userData.legs=legs;
  group.userData.neck=neckPivot;
  group.userData.tail=tailPivot;
  return group;
}
function makeWorker(f){
  const group=new THREE.Group(),skin=0xd6a17d,shirt=f.color||'#759389';
  contactShadow(group,.75,.48);
  const legs=[],arms=[];
  for(const sign of [-1,1]){
    const leg=new THREE.Group();
    leg.position.set(0,1.29,sign*.30);
    group.add(leg);
    box(leg,.37,1.08,.39,0,-.53,0,0x4e5045);
    box(leg,.70,.20,.42,.16,-1.09,0,0x514237);
    legs.push(leg);
    const arm=new THREE.Group();
    arm.position.set(0,2.37,sign*.74);group.add(arm);
    box(arm,.29,1.02,.32,0,-.50,0,shirt);
    box(arm,.27,.30,.30,0,-1.08,0,skin);
    arms.push(arm);
  }
  box(group,1.35,1.45,.80,0,1.92,0,shirt);
  box(group,.50,.44,.45,0,2.73,0,skin);
  const headGeometry=new THREE.SphereGeometry(.56,8,6);
  headGeometry.__fvTransient=true;
  const head=new THREE.Mesh(headGeometry,mat(skin));
  head.position.set(0,3.10,0);group.add(head);
  const hatColor=f.role==='tratador'?0x7393a0:
    f.role==='agricultor'?0xc7ad70:0x6f806a;
  const brimGeometry=new THREE.CylinderGeometry(.85,.85,.12,10);
  brimGeometry.__fvTransient=true;
  const brim=new THREE.Mesh(brimGeometry,mat(hatColor));
  brim.position.set(0,3.50,0);group.add(brim);
  cylinder(group,.44,.55,.51,0,3.75,0,hatColor,9);
  // Peito/frente na direção +X, para combinar com o rumo no Canvas.
  box(group,.18,.36,.40,.72,2.22,0,0xe2d0a3);
  const tool=new THREE.Group();group.add(tool);
  if(f.role==='tratador'){
    cylinder(tool,.43,.32,.68,1.15,.84,.30,0x668b92,9);
    box(tool,.11,.55,.11,1.15,1.37,.30,0xbdc4ba);
    box(tool,.42,.12,.13,1.15,1.58,.30,0xbdc4ba);
  }else if(f.role==='agricultor'){
    box(tool,.15,2.2,.15,1.12,1.28,.30,0xa77f4e);
    box(tool,.62,.11,.38,1.12,.28,.32,0x758481);
  }else{
    box(tool,.98,1.18,.12,1.08,1.52,.38,0x8e683e);
    box(tool,.80,.91,.14,1.08,1.53,.48,0xe4d8ba);
  }
  // Ação localizada no equipamento que o trabalhador está operando.
  // Quando a tarefa termina, os elementos somem. Não há efeitos em idle.
  const workFx=new THREE.Group();
  const fxColor=f.role==='tratador'?0x76bfd0:
    f.role==='agricultor'?0xb3c26a:0xdfd4ad;
  for(let i=0;i<4;i++){
    const particle=box(workFx,.20+i*.055,.19+i*.04,.18,
      0,0,0,fxColor);
    particle.userData.index=i;
  }
  workFx.visible=false;group.add(workFx);
  group.userData.workFx=workFx;
  group.userData.legs=legs;
  group.userData.arms=arms;
  group.userData.tool=tool;
  return group;
}
function makeTrees(parent,trees){
  // Duas silhuetas: copas arredondadas de mata brasileira e coníferas de campos altos.
  // Instancing: poucas chamadas de desenho mesmo com mais de mil árvores.
  const broad=trees.filter((_,i)=>i%5<3);
  const conifers=trees.filter((_,i)=>i%5>=3);
  const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.65,.93,3.9,6),mat(colors.timber),trees.length);
  const round=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),mat(0x648c50),broad.length);
  const round2=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),mat(0x789f5b),broad.length);
  const cones=new THREE.InstancedMesh(new THREE.ConeGeometry(4.4,9.3,7),mat(0x467442),conifers.length);
  const cones2=new THREE.InstancedMesh(new THREE.ConeGeometry(3.4,7,7),mat(0x55834a),conifers.length);
  const dummy=new THREE.Object3D();let nb=0,nc=0;
  trees.forEach((tree,i)=>{
    const scale=(tree.s||1)*(i%6===0?.85:1);
    dummy.position.set(tree.x,1.9*scale,tree.y);
    dummy.rotation.set(0,0,0);
    dummy.scale.set(scale,scale,scale);
    dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
    if(i%5<3){
      dummy.position.set(tree.x,7.0*scale,tree.y);
      dummy.scale.set(4.8*scale,3.65*scale,4.5*scale);
      dummy.updateMatrix();round.setMatrixAt(nb,dummy.matrix);
      dummy.position.set(tree.x-1.25*scale,8.3*scale,tree.y+.6*scale);
      dummy.scale.set(3.1*scale,2.8*scale,3.5*scale);
      dummy.updateMatrix();round2.setMatrixAt(nb,dummy.matrix);
      nb++;
    }else{
      dummy.position.set(tree.x,7.4*scale,tree.y);
      dummy.scale.set(scale,scale,scale);
      dummy.updateMatrix();cones.setMatrixAt(nc,dummy.matrix);
      dummy.position.set(tree.x,10.5*scale,tree.y);
      dummy.updateMatrix();cones2.setMatrixAt(nc,dummy.matrix);
      nc++;
    }
  });
  for(const m of [trunks,round,round2,cones,cones2]){m.instanceMatrix.needsUpdate=true;parent.add(m)}
}
function makeCrops(parent,fields){
  // Cultivos físicos por instancing: uma chamada de desenho para centenas
  // de plantas, sem centenas de Mesh independentes no navegador do celular.
  const cols=7,rows=11;
  const plants=new THREE.InstancedMesh(new THREE.ConeGeometry(.69,2.0,5),
    mat(0x8daa53),fields.length*cols*rows);
  const top=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.48,0),
    mat(0xbdad65),fields.length*cols*rows);
  const dummy=new THREE.Object3D();
  let id=0;
  for(let k=0;k<fields.length;k++){
    const f=fields[k];
    for(let i=1;i<=cols;i++)for(let j=1;j<=rows;j++){
      const x=f.x-f.w*.5+i*f.w/(cols+1);
      const z=f.y-f.h*.5+j*f.h/(rows+1);
      const variation=Math.sin((i*41+j*17+k*103)*1.783);
      const scale=.80+.16*(variation+1);
      dummy.position.set(x,1.32*scale+.41,z);
      dummy.rotation.set(0,i*.37+j*.13,0);
      dummy.scale.set(scale,scale,scale);
      dummy.updateMatrix();plants.setMatrixAt(id,dummy.matrix);
      dummy.position.set(x,2.1*scale+.38,z);
      dummy.scale.set(scale*.52,scale*.62,scale*.52);
      dummy.updateMatrix();top.setMatrixAt(id,dummy.matrix);
      if(plants.setColorAt){
        plants.setColorAt(id,new THREE.Color(
          (i+j+k)%4===0?0xb2b164:(i+j)%2?0x789d50:0x8baa50));
      }
      if(top.setColorAt)
        top.setColorAt(id,new THREE.Color((i+j+k)%3?0xc9b574:0x9eb15c));
      id++;
    }
  }
  for(const obj of [plants,top]){
    obj.instanceMatrix.needsUpdate=true;
    if(obj.instanceColor)obj.instanceColor.needsUpdate=true;
    parent.add(obj);
  }
}
function drawWorld(s){
  const root=new THREE.Group(); scene.add(root);
  // O plano deve ocupar toda a extensão visível em zoom regional — sem bordas azuis.
  flat(root,3600,3400,0,0,colors.grass,-.12);
  // Grandes manchas de pastagem orgânica. Evita quadrados escuros perfeitamente repetidos.
  const rng=(n)=>{const v=Math.sin(n*93.174+8.32)*43758.5453;return v-Math.floor(v)};
  for(let i=0;i<88;i++){
    const x=rng(i*3)*2800-1400,z=rng(i*3+1)*2600-1300;
    const rx=20+rng(i+91)*48,rz=18+rng(i+134)*41;
    const tint=i%4===0?0x8eaf73:i%3===0?0x86a66c:0x8aaa70;
    ellipse(root,x,z,rx,rz,tint,.065+(i%4)*.013);
  }
  // Centro Rural: referência espacial persistente, conectado à estrada horizontal.
  const fx=s.fairground?.x??-65,fz=s.fairground?.y??212;
  road(root,fx,140,fx,185,6,.24);
  flat(root,81,58,fx,fz,0x9ba979,.12);
  flat(root,71,49,fx,fz,0xc9b18a,.20);
  flat(root,60,38,fx,fz,0xdcc69e,.29);
  // Cerca baixa, entrada aberta ao sul e área de circulação para visitantes.
  for(const side of [-1,1]){
    const x=fx+side*35;
    box(root,.50,1.9,42,x,1.08,fz,0xa68c62);
    for(let i=-2;i<=2;i++)
      box(root,.66,2.1,.66,x,1.1,fz+i*9.3,0xcbb287);
  }
  box(root,62,.30,.52,fx,1.14,fz-24,0xa68c62);
  box(root,62,.30,.52,fx,1.14,fz+24,0xa68c62);
  for(const x of [fx-18,fx+18]){
    box(root,.65,3.4,.65,x,1.87,fz-25,0x967954);
    box(root,.75,.28,.75,x,3.7,fz-25,0xd2b17b);
  }
  // Pátios e conexões internos são desenhados sem cruzar as baias.

  road(root,-140,-580,-140,580,14,.16);
  road(root,140,-580,140,580,14,.16);
  road(root,-580,140,580,140,14,.205);
  for(const o of s.owners){
    if(o.x<-100)road(root,o.x+122,o.y,-140,o.y,8,.235);
    else if(o.x>100)road(root,140,o.y,o.x-122,o.y,8,.235);
    else road(root,o.x,140,o.x,o.y+120,8,.235);
    ellipse(root,o.x,o.y,121,118,o.style?.ground??(o.ai?0x91ae74:0xa0b779),.24);
    // Solo compactado junto à entrada, sem passar por baixo das estruturas.
    const entranceX=o.x<-100?o.x+112:o.x>100?o.x-112:o.x;
    const entranceY=Math.abs(o.x)<100?o.y+112:o.y;
    ellipse(root,entranceX,entranceY,8,7,0xbaa17b,.34);
    // Portão rural aberto: dois mourões marcam a transição da estrada externa
    // para a rede interna. O vão preserva a circulação dos NPCs e cavalos.
    const gateX=o.x<-100?o.x+121:o.x>100?o.x-121:o.x;
    const gateZ=Math.abs(o.x)<100?o.y+118:o.y;
    const lateralX=Math.abs(o.x)<100?1:0,lateralZ=lateralX?0:1;
    for(const side of [-1,1]){
      const gx=gateX+side*lateralX*5.8;
      const gz=gateZ+side*lateralZ*5.8;
      box(root,1.20,4.1,1.20,gx,2.1,gz,0xb18e61);
      box(root,1.47,.36,1.47,gx,4.36,gz,0xdfbd83);
      box(root,1.90,.28,1.90,gx,.28,gz,0x9c885e);
    }
    // Cercas físicas de dois trilhos; a entrada fica voltada para a estrada de acesso.
    const n=60, posts=new THREE.InstancedMesh(new THREE.BoxGeometry(.9,3,.9),mat(0xe4ca98),n);
    const rails=new THREE.InstancedMesh(new THREE.BoxGeometry(1,.28,.42),mat(0xd3b583),n*2);
    const dummy=new THREE.Object3D();
    const gate=o.x<-100?0:o.x>100?Math.PI:Math.PI/2;
    const closeToGate=a=>Math.abs(Math.atan2(Math.sin(a-gate),Math.cos(a-gate)))<.13;
    for(let i=0;i<n;i++){
      const ang=2*Math.PI*i/n,next=2*Math.PI*(i+1)/n;
      const x1=o.x+121*Math.cos(ang),z1=o.y+118*Math.sin(ang);
      const x2=o.x+121*Math.cos(next),z2=o.y+118*Math.sin(next);
      const gatePost=closeToGate(ang),gateRail=gatePost||closeToGate(next);
      dummy.rotation.set(0,0,0);
      dummy.scale.set(gatePost?0:1,gatePost?0:1,gatePost?0:1);
      dummy.position.set(x1,1.5,z1);dummy.updateMatrix();posts.setMatrixAt(i,dummy.matrix);
      const dx=x2-x1,dz=z2-z1,length=Math.hypot(dx,dz);
      for(let level=0;level<2;level++){
        dummy.position.set((x1+x2)/2,1.1+level*1.05,(z1+z2)/2);
        dummy.rotation.y=-Math.atan2(dz,dx);
        dummy.scale.set(gateRail?0:length,gateRail?0:1,gateRail?0:1);
        dummy.updateMatrix();rails.setMatrixAt(i*2+level,dummy.matrix);
      }
    }
    posts.instanceMatrix.needsUpdate=true;rails.instanceMatrix.needsUpdate=true;
    root.add(posts,rails);
  }
  // Terraplenagem suaviza cruzamentos em vez de dois retângulos coplanares.
  for(const x of [-140,140])ellipse(root,x,140,10.2,10.2,0xc8b18c,.33);
  for(const f of s.fields){
    flat(root,f.w,f.h,f.x,f.y,colors.crop,.29);
    for(let i=-3;i<=3;i++)flat(root,1.2,f.h-3,f.x+i*f.w/8,f.y,0x6d8f4c,.38);
  }
  makeCrops(root,s.fields);
  for(const p of s.ponds){
    ellipse(root,p.x,p.y,p.rx+3,p.ry+3,0xc1bb87,.38);
    ellipse(root,p.x,p.y,p.rx,p.ry,colors.water,.46);
    for(let i=0;i<12;i++){
      const a=(i*2.39996),x=p.x+(p.rx+1)*Math.cos(a),z=p.y+(p.ry+1)*Math.sin(a);
      cylinder(root,.35,.5,2.1,x,1.08,z,i%2?0x57833c:0x6c984e,5);
    }
    // Plantas flutuantes discretas, sem triângulos coplanares no açude.
    for(let i=0;i<8;i++){
      const angle=(i*2.39996),
        x=p.x+Math.cos(angle)*p.rx*.59,
        z=p.y+Math.sin(angle)*p.ry*.56;
      const pad=new THREE.Mesh(new THREE.CircleGeometry(1,12),
        mat(i%2?0x55885f:0x6f965d));
      pad.position.set(x,.504,z);pad.rotation.x=-Math.PI/2;
      pad.scale.set(1.0+i%3*.27,.51+i%2*.12,1);
      root.add(pad);
    }
  }
  makeTrees(root,s.trees);
  content=new THREE.Group();scene.add(content);
  horseLayer=new THREE.Group();scene.add(horseLayer);
  workerLayer=new THREE.Group();scene.add(workerLayer);
  trailLayer=new THREE.Group();scene.add(trailLayer);
  grassLayer=new THREE.Group();scene.add(grassLayer);
  fairLayer=new THREE.Group();scene.add(fairLayer);
  ranchLayer=new THREE.Group();scene.add(ranchLayer);
}
// Mesmo conjunto de props usados no Canvas. Geometrias simples, recoloridas
// por InstancedMesh e recalculadas só quando a simulação rearranja o terreno.
const EMPTY_RANCH_DECOR=Object.freeze([]);
function syncRanchDecor(s){
  const sites=s.ranchDecor||EMPTY_RANCH_DECOR;
  const isEco=!!s.lowGraphics;
  ranchLayer.visible=s.zoom>=.62;
  if(sites===lastRanchDecor&&isEco===lastDecorEco)return;
  lastRanchDecor=sites;lastDecorEco=isEco;
  for(const old of [...ranchLayer.children]){
    ranchLayer.remove(old);disposeTransientGroup(old);
  }
  const visible=isEco?sites.filter((_,i)=>i%3!==0):sites;
  const species=['arvore','arbusto','flores','feno','pedra'];
  const geometry=(type)=>{
    let g;
    if(type==='arvore_tronco')g=new THREE.CylinderGeometry(.46,.70,4.45,6);
    else if(type==='arvore_copa')g=new THREE.IcosahedronGeometry(1,1);
    else if(type==='arvore_luz')g=new THREE.IcosahedronGeometry(1,0);
    else if(type==='arbusto')g=new THREE.IcosahedronGeometry(1,0);
    else if(type==='flores')g=new THREE.IcosahedronGeometry(.38,0);
    else if(type==='flores_folhas')g=new THREE.ConeGeometry(.8,1.35,5);
    else if(type==='feno')g=new THREE.CylinderGeometry(1.1,1.1,2.35,9);
    else if(type==='feno_faixa')g=new THREE.CylinderGeometry(1.14,1.14,.18,9);
    else g=new THREE.IcosahedronGeometry(1,0);
    g.__fvTransient=true;return g;
  };
  const meshes={
    arvore_tronco:geometry('arvore_tronco'),
    arvore_copa:geometry('arvore_copa'),
    arvore_luz:geometry('arvore_luz'),
    arbusto:geometry('arbusto'),
    flores:geometry('flores'),
    flores_folhas:geometry('flores_folhas'),
    feno:geometry('feno'),
    feno_faixa:geometry('feno_faixa'),
    pedra:geometry('pedra')
  };
  const layouts={
    arvore:[['arvore_tronco',0x7c6245],['arvore_copa',0x6b934f],['arvore_luz',0x94b66f]],
    arbusto:[['arbusto',0x628b52]],
    flores:[['flores_folhas',0x74994b],['flores',0xe2b66a]],
    feno:[['feno',0xc7b077],['feno_faixa',0x8c7048]],
    pedra:[['pedra',0x939286]]
  };
  const dummy=new THREE.Object3D();
  const allMeshes=[];
  for(const kind of species){
    const selected=visible.filter(p=>p.kind===kind);
    if(!selected.length)continue;
    for(const [part,tint] of layouts[kind]){
      const mesh=new THREE.InstancedMesh(meshes[part],mat(tint),selected.length);
      selected.forEach((p,i)=>{
        const scale=p.scale||1;
        let px=p.x,py=.44,pz=p.y,sx=scale,sy=scale,sz=scale;
        if(part==='arvore_tronco'){
          py=2.4*scale;sx=scale;sy=scale;sz=scale;
        }else if(part==='arvore_copa'){
          py=5.75*scale;sx=3.35*scale;sy=2.35*scale;sz=3.1*scale;
        }else if(part==='arvore_luz'){
          px-=1.2*scale;py=6.65*scale;pz+=.55*scale;
          sx=1.85*scale;sy=1.55*scale;sz=1.75*scale;
        }else if(part==='arbusto'){
          py=1.0*scale;sx=1.8*scale;sy=1.0*scale;sz=1.5*scale;
        }else if(part==='flores_folhas'){
          py=.75*scale;sx=scale;sy=scale;sz=scale;
        }else if(part==='flores'){
          py=1.48*scale;sx=1.0*scale;sy=.7*scale;sz=1.05*scale;
        }else if(part==='feno'){
          py=1.35*scale;sx=scale;sy=scale;sz=scale;
        }else if(part==='feno_faixa'){
          py=1.35*scale;sx=scale;sy=scale;sz=scale;
        }else if(part==='pedra'){
          py=.66*scale;sx=1.25*scale;sy=.54*scale;sz=.92*scale;
        }
        dummy.position.set(px,py,pz);
        dummy.rotation.set(0,(p.variant||0)*.76,part==='feno'?Math.PI/2:0);
        dummy.scale.set(sx,sy,sz);dummy.updateMatrix();
        mesh.setMatrixAt(i,dummy.matrix);
        if(mesh.setColorAt){
          const color=part==='arvore_copa'||part==='arbusto'?
            (p.color||0x6b934f):part==='flores'?
            (p.variant%2?0xe4b48d:0xe5c17b):tint;
          mesh.setColorAt(i,new THREE.Color(color));
        }
      });
      mesh.instanceMatrix.needsUpdate=true;
      if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
      mesh.frustumCulled=false;ranchLayer.add(mesh);
      allMeshes.push(mesh);
    }
  }
  // Descartar malhas geométricas de tipos ausentes.
  for(const [name,geo] of Object.entries(meshes)){
    if(!allMeshes.some(mesh=>mesh.geometry===geo))geo.dispose?.();
  }
}
// Feira e contratos têm presença no mundo: tendas, madeira e cores coerentes
// com o evento da economia. A camada só muda quando o evento muda.
function syncFairground(s){
  const e=s.ruralEvent,stamp=(e?.id||'sem-evento')+'|'+
    (e?.claimed?'participou':'disponivel')+'|'+!!s.lowGraphics;
  if(stamp===lastFairStamp)return;
  lastFairStamp=stamp;
  for(const old of [...fairLayer.children]){
    fairLayer.remove(old);disposeTransientGroup(old);
  }
  const fx=s.fairground?.x??-65,fz=s.fairground?.y??212;
  const tint=e?.id==='feira'?0xb55b40:e?.id==='safra'?0xd2b65c:
    e?.id==='insumos'?0x5b9795:e?.id==='mutirao'?0x8fae69:0x937a5b;
  const trim=e?.claimed?0xe6d79c:0xf3dfad;
  const placements=[[-19,-11],[8,-11],[-19,9],[8,9]];
  const boothCount=s.lowGraphics?2:placements.length;
  for(let i=0;i<boothCount;i++){
    const [dx,dz]=placements[i],booth=new THREE.Group();
    booth.position.set(fx+dx,0,fz+dz);fairLayer.add(booth);
    // Abrigos montáveis apoiados em estacas reais (sem telhado flutuante).
    for(const x of [-5.6,5.6])for(const z of [-3.8,3.8]){
      box(booth,.27,3.8,.27,x,2.21,z,0x826246);
    }
    roof(booth,13.0,8.6,4.18,5.75,tint);
    box(booth,9.4,.27,.32,0,4.14,4.15,trim);
    box(booth,8.6,.20,1.9,0,1.28,3.05,0x99744d);
    box(booth,7.5,1.1,.24,0,.73,3.90,0x735a40);
    for(const x of [-3.5,3.5])
      cylinder(booth,.53,.63,.88,x,.71,3.13,0xbda267,7);
    // Cada evento tem materiais reconhecíveis: feira, colheita ou insumos.
    if(e?.id==='safra'||e?.id==='insumos'){
      for(const x of [-2.6,0,2.6])
        box(booth,1.6,.94,1.5,x,.76,-.7,e.id==='safra'?0xc8b16d:0x789d91);
    }else if(e?.id==='feira'){
      rails(booth,8,5,0xcbad7b,1.15);
    }else{
      box(booth,2.0,.80,1.2,-2.2,.70,-.70,0xbd9a68);
      box(booth,1.35,.43,2.4,2.1,.57,-.75,0x789a81);
    }
  }
  const board=new THREE.Group();
  board.position.set(fx,0,fz-22);fairLayer.add(board);
  box(board,17.5,3.35,.35,0,3.1,0,0x685039);
  box(board,16.4,2.50,.42,0,3.1,.24,e?tint:0x947b54);
  for(const x of [-6.7,6.7])box(board,.5,4.5,.45,x,2.3,0,0xc9a575);
  for(let i=0;i<3;i++)
    box(board,3.0,.26,.45,(i-1)*4.1,3.1,.47,trim);
}

// Estradas internas são quads leves em uma única malha instanciada.
function syncTrails(s){
  const segments=s.trails||[];
  if(segments===lastTrailObject&&segments.length===lastTrailLength)return;
  lastTrailObject=segments;lastTrailLength=segments.length;
  const key=segments.map(t=>
    [t.x1,t.y1,t.x2,t.y2,t.w].map(v=>Number(v).toFixed(1)).join(',')).join('|');
  if(key===trailStamp3D)return;
  for(const old of [...trailLayer.children]){
    trailLayer.remove(old);
    old.dispose?.();
    if(old.geometry?.__fvTransient)old.geometry.dispose?.();
  }
  trailStamp3D=key;
  if(!segments.length)return;
  // Todos os trechos usam orientação +atan2(dx,dz): no Three.js
  // o eixo +Z de um objeto rotacionado em Y aponta para (sin(yaw),cos(yaw)).
  // A rotação negativa anterior espelhava TODOS os caminhos diagonais.
  const soil=new THREE.InstancedMesh(sharedBox(1,.035,1),mat(0xa68c6b),segments.length);
  const path=new THREE.InstancedMesh(sharedBox(1,.035,1),mat(0xc3ad88),segments.length);
  const tracks=new THREE.InstancedMesh(sharedBox(.14,.012,1),mat(0xb69e7c),segments.length*2);
  const capsGeo=new THREE.CylinderGeometry(1,1,.035,10);
  capsGeo.__fvTransient=true;
  const caps=new THREE.InstancedMesh(capsGeo,mat(0xc3ad88),segments.length*2);
  const dummy=new THREE.Object3D();
  for(let i=0;i<segments.length;i++){
    const t=segments[i],dx=t.x2-t.x1,dz=t.y2-t.y1;
    const len=Math.hypot(dx,dz);
    if(len<.05)continue;
    const mx=(t.x1+t.x2)/2,mz=(t.y1+t.y2)/2;
    const yaw=Math.atan2(dx,dz);
    const perpX=dz/len,perpZ=-dx/len;
    const width=t.w||2.5;
    dummy.rotation.set(0,yaw,0);
    dummy.position.set(mx,.317,mz);
    dummy.scale.set(width+.48,1,len+.20);dummy.updateMatrix();
    soil.setMatrixAt(i,dummy.matrix);
    dummy.position.set(mx,.354,mz);
    dummy.scale.set(width,1,len+.25);dummy.updateMatrix();
    path.setMatrixAt(i,dummy.matrix);
    for(let j=0;j<2;j++){
      const offset=(j?1:-1)*width*.21;
      dummy.position.set(mx+perpX*offset,.381,mz+perpZ*offset);
      // Estradas principais possuem sulcos; nos acessos pedonais os sulcos
      // eram interpretados como tábuas soltas quando a câmera aproximava.
      dummy.scale.set(t.kind==='servico'?0:1,1,t.kind==='servico'?0:len+.10);
      dummy.updateMatrix();
      tracks.setMatrixAt(i*2+j,dummy.matrix);
    }
    dummy.rotation.set(0,0,0);
    for(const [j,x,z] of [[0,t.x1,t.y1],[1,t.x2,t.y2]]){
      dummy.position.set(x,.356,z);
      dummy.scale.set(width*.5,1,width*.5);dummy.updateMatrix();
      caps.setMatrixAt(i*2+j,dummy.matrix);
    }
  }
  for(const mesh of [soil,path,tracks,caps]){
    mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;
    trailLayer.add(mesh);
  }
}
function scatterPasture(s){
  // Construções e rotas mudam com baixa frequência; evitar cálculo geométrico por frame.
  if(lastGrassBuildings===s.buildings.length&&lastGrassTrails===s.trails)return;
  lastGrassBuildings=s.buildings.length;lastGrassTrails=s.trails;
  grassStamp3D=String(s.buildings.length)+'|'+trailStamp3D;
  for(const m of [...grassLayer.children]){
    grassLayer.remove(m);
    m.dispose?.();
    // A vegetação usa geometrias próprias por lote, não as caixas reutilizadas.
    m.geometry?.dispose?.();
  }
  // Em áreas externas aos prédios, touceiras discretas quebram o 'tapete verde'.
  // O algoritmo é determinístico: elas não mudam de lugar quando a câmera se move.
  const patches=[],blooms=[],trails=s.trails||[];
  const hash=n=>{const k=Math.sin(n*73.619+12.7)*43758.545;return k-Math.floor(k)};
  const farFromTrail=(x,z)=>{
    for(const tr of trails){
      const dx=tr.x2-tr.x1,dz=tr.y2-tr.y1,len2=dx*dx+dz*dz||1;
      const t=Math.max(0,Math.min(1,((x-tr.x1)*dx+(z-tr.y1)*dz)/len2));
      if(Math.hypot(x-(tr.x1+t*dx),z-(tr.y1+t*dz))<(tr.w||2.4)*.5+2.25)return false;
    }
    return true;
  };
  for(let k=0;k<s.owners.length;k++){
    const o=s.owners[k];
    for(let i=0;i<145;i++){
      const angle=hash(i*19.7+k*81.3)*Math.PI*2;
      const radius=Math.sqrt(hash(i*11.13+k*137+78))*106;
      const x=o.x+Math.cos(angle)*radius,z=o.y+Math.sin(angle)*radius;
      if(s.buildings.some(b=>b.o===o&&Math.abs(x-b.x)<b.w/2+3.9&&Math.abs(z-b.y)<b.h/2+3.9))continue;
      if(!farFromTrail(x,z))continue;
      // Evitar acessos asfaltados/água e manter clareiras junto aos estábulos.
      if(s.ponds.some(p=>Math.hypot((x-p.x)/p.rx,(z-p.y)/p.ry)<1.2))continue;
      const height=.45+hash(i*5+k*51)*.95,scale=.42+hash(i*7+k*37)*.55;
      patches.push({x,z,height,scale,shade:Math.floor(hash(i*17+k*4)*4)});
      if(i%8===0)blooms.push({x:x+.3,z:z-.3,scale:.65+hash(i*3+k)*.6});
    }
  }
  if(patches.length){
    const clusters=new THREE.InstancedMesh(new THREE.ConeGeometry(.82,1,5),mat(0x71984e),patches.length);
    const dummy=new THREE.Object3D();
    for(let i=0;i<patches.length;i++){
      const g=patches[i];
      dummy.position.set(g.x,.37+g.height*.5,g.z);
      dummy.rotation.set(0,(i*2.39996)%(Math.PI*2),0);
      dummy.scale.set(g.scale,g.height,g.scale);
      dummy.updateMatrix();clusters.setMatrixAt(i,dummy.matrix);
      if(clusters.setColorAt){
        clusters.setColorAt(i,new THREE.Color([0x668e48,0x779951,0x829f58,0x688945][g.shade]));
      }
    }
    clusters.instanceMatrix.needsUpdate=true;
    if(clusters.instanceColor)clusters.instanceColor.needsUpdate=true;
    grassLayer.add(clusters);
  }
  if(blooms.length){
    const flower=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.35,0),mat(0xddc379),blooms.length);
    const dummy=new THREE.Object3D();
    for(let i=0;i<blooms.length;i++){
      const g=blooms[i];
      dummy.position.set(g.x,.83,g.z);dummy.rotation.set(0,0,0);
      dummy.scale.set(g.scale,g.scale*.55,g.scale);dummy.updateMatrix();
      flower.setMatrixAt(i,dummy.matrix);
    }
    flower.instanceMatrix.needsUpdate=true;grassLayer.add(flower);
  }
}
function modelVersion(b,highDetail){
  return (highDetail?'H':'L')+'|'+b.type+'|'+b.x.toFixed(2)+'|'+b.y.toFixed(2)+
    '|'+(b.tier||1)+'|'+(b.status||'complete')+'|'+(b.progress??100)+
    '|'+(b.plannedTier||0);
}
function sync(s){
  syncTrails(s);
  syncFairground(s);
  syncRanchDecor(s);
  // No modo econômico preservamos a navegação e o mundo, ocultando somente decoração.
  grassLayer.visible=!s.lowGraphics;
  if(!s.lowGraphics)scatterPasture(s);
  // Histerese: mudanças pequenas no zoom não transformam todos os modelos.
  if(s.lowGraphics)detailMode=s.zoom>=3.3;
  else if(detailMode===null)detailMode=s.zoom>=1.05;
  else if(detailMode&&s.zoom<.89)detailMode=false;
  else if(!detailMode&&s.zoom>1.18)detailMode=true;
  const highDetail=detailMode;
  // Culling por área da câmera, com margem generosa para evitar pop-in mobile.
  const radius=s.zoom>=3?190:s.zoom>=1.6?285:s.zoom>=.72?540:1410;
  const nearby=s.buildings.filter(b=>
    Math.abs(b.x-s.panX)<radius&&Math.abs(b.y-s.panY)<radius
  );
  const visible=new Set(nearby);
  for(const [b,record] of [...modelsByBuilding.entries()]){
    if(!visible.has(b)){
      content.remove(record.model);
      disposeTransientGroup(record.model);
      modelsByBuilding.delete(b);
    }
  }
  for(const b of nearby){
    // LOD por construção, não por fazenda inteira: um galpão distante não
    // precisa de centenas de detalhes só porque o zoom local está elevado.
    const distance=Math.hypot(b.x-s.panX,b.y-s.panY);
    const detailed=highDetail&&!s.lowGraphics&&
      distance<(s.zoom>=3?96:s.zoom>=1.7?145:205);
    const version=modelVersion(b,detailed);
    const record=modelsByBuilding.get(b);
    if(record&&record.version===version)continue;
    if(record){
      content.remove(record.model);
      disposeTransientGroup(record.model);
    }
    const model=building(b,detailed);
    content.add(model);
    modelsByBuilding.set(b,{model,version});
  }
  if(horseLayer.children.length!==s.horses.length){
    for(const child of [...horseLayer.children]){
      horseLayer.remove(child);disposeTransientGroup(child);
    }
    for(const h of s.horses)horseLayer.add(makeHorse(h));
  }
  s.horses.forEach((h,i)=>{
    const mesh=horseLayer.children[i];if(!mesh)return;
    const x=h.x??h.o.x,z=h.y??h.o.y;
    mesh.visible=s.zoom>.42&&Math.abs(x-s.panX)<245&&Math.abs(z-s.panY)<245;
    if(!mesh.visible)return;
    const walking=h.motion==='walk',gait=h.gait||0;
    mesh.position.set(x,.12+(walking?Math.abs(Math.sin(gait))*.055:0),z);
    mesh.rotation.y=h.heading||0;
    const age=(h.age||0)+Math.floor(Math.max(0,s.day-(h.bornDay||1))/365);
    const animalScale=age<1?.65:age<2?.83:1;
    mesh.scale.set(animalScale,animalScale,animalScale);
    const legs=mesh.userData.legs||[];
    for(let j=0;j<legs.length;j++){
      // Passada diagonal; pares opostos não patinam em sincronia.
      const pair=(j===0||j===3)?0:Math.PI;
      legs[j].rotation.z=walking?Math.sin(gait+pair)*.27:0;
    }
    if(mesh.userData.neck)
      mesh.userData.neck.rotation.z=h.interacting?
        -.12+Math.sin(h.phase*2.5+h.id)*.09:
        h.motion==='graze'?-.60+Math.sin(h.phase*.32)*.06:
        walking?Math.sin(gait*.5)*.08:-.05;
    if(mesh.userData.tail)
      mesh.userData.tail.rotation.z=h.interacting?
        -.14+Math.sin(h.phase*3.2+h.id)*.22:
        -.18+Math.sin(h.phase*.48+h.id)*.14;
    const careFx=mesh.userData.careFx;
    if(careFx){
      const rationActive=(h.careSpecialUntil??-1)>h.phase;
      careFx.visible=s.zoom>1.5&&!s.lowGraphics&&
        (h.interacting||(h.careEffectUntil??-1)>h.phase||rationActive);
      if(mesh.userData.specialCareFx)
        mesh.userData.specialCareFx.visible=rationActive;
      if(careFx.visible){
        careFx.position.y=5.4+Math.sin(h.phase*4+h.id)*.21;
        careFx.rotation.y=-mesh.rotation.y;
        const size=.86+Math.sin(h.phase*3+h.id)*.06;
        careFx.scale.set(size,size,size);
      }
    }
  });
  if(workerLayer.children.length!==s.farmers.length){
    for(const child of [...workerLayer.children]){
      workerLayer.remove(child);disposeTransientGroup(child);
    }
    for(const f of s.farmers)workerLayer.add(makeWorker(f));
  }
  workerLayer.visible=s.zoom>.47;
  if(workerLayer.visible)s.farmers.forEach((f,i)=>{
    const character=workerLayer.children[i];if(!character)return;
    character.visible=Math.abs(f.x-s.panX)<235&&Math.abs(f.y-s.panY)<235;
    if(!character.visible)return;
    const walking=f.motion==='walk',working=f.motion==='work';
    character.position.set(f.x,.14+(walking?Math.abs(Math.sin(f.gait||0))*.055:0),f.y);
    character.rotation.y=-(f.visualHeading??f.heading??0);
    const legs=character.userData.legs||[];
    const arms=character.userData.arms||[];
    for(let k=0;k<legs.length;k++)
      legs[k].rotation.z=walking?Math.sin((f.gait||0)+k*Math.PI)*.34:0;
    for(let k=0;k<arms.length;k++)
      arms[k].rotation.z=walking?
        Math.sin((f.gait||0)+k*Math.PI)*.24:
        working?Math.sin((f.animTime||0)*3.0+k)*.12:0;
    const tool=character.userData.tool;
    if(tool){
      tool.rotation.z=working?Math.sin((f.animTime||0)*3.2)*.12:0;
      tool.position.y=working?Math.sin((f.animTime||0)*3.2)*.07:0;
    }
    const workFx=character.userData.workFx;
    if(workFx){
      workFx.visible=working&&!s.lowGraphics&&s.zoom>1.45;
      if(workFx.visible){
        const phase=(f.animTime||0)*2.8;
        workFx.children.forEach((p,j)=>{
          const fz=f.role==='tratador'?.45:f.role==='agricultor'?-.32:.15;
          const t=(phase*.18+j*.27)%1;
          p.position.set(1.05+.3*Math.sin(phase+j*2.1),
            .35+t*(f.role==='tratador'?1.7:2.4),
            fz+(j-1.5)*.25);
          const grow=(1-t)*(.7+(j%2)*.35);
          p.scale.set(grow,grow,grow);
        });
      }
    }
  });
}
function updateLabels(s){
  for(let i=0;i<s.owners.length;i++){
    const o=s.owners[i],label=labelNodes[i];
    // Em detalhes, liberar a paisagem das etiquetas das cabanhas.
    if(s.zoom>1.13){label.style.display='none';continue}
    const p=new THREE.Vector3(o.x,14,o.y-40).project(camera);
    const x=(p.x*.5+.5)*innerWidth,y=(-p.y*.5+.5)*innerHeight;
    label.style.transform='translate(-50%,-50%) translate('+x+'px,'+y+'px)';
    label.style.display=x<0||x>innerWidth||y<95||y>innerHeight-55?'none':'block';
  }
  if(fairLabel){
    const fx=s.fairground?.x??-65,fz=s.fairground?.y??212;
    const p=new THREE.Vector3(fx,10,fz-34).project(camera);
    const x=(p.x*.5+.5)*innerWidth,y=(-p.y*.5+.5)*innerHeight;
    const visible=s.zoom<2.7&&x>84&&x<innerWidth-84&&y>185&&y<innerHeight-100;
    fairLabel.style.display=visible?'block':'none';
    if(visible){
      fairLabel.style.transform='translate(-50%,-100%) translate('+x+'px,'+y+'px)';
      const label=s.ruralEvent?'🎪 '+s.ruralEvent.name:'🏛️ Centro Rural';
      if(fairLabel.textContent!==label)fairLabel.textContent=label;
    }
  }
  if(!workerLabels.length)return;
  // Duas identificações próximas no máximo: não cobrir os personagens no celular.
  const ordered=workerLabels.map(item=>({
    item,dist:Math.hypot(item.f.x-s.panX,item.f.y-s.panY)
  })).sort((a,b)=>a.dist-b.dist);
  const chosen=new Set(
    !s.lowGraphics&&s.zoom>=2.55?ordered.filter(x=>x.dist<42).slice(0,2).map(x=>x.item):[]
  );
  const placed=[];
  for(const item of ordered.map(x=>x.item)){
    const el=item.el,f=item.f;
    if(!chosen.has(item)){el.style.display='none';continue}
    const v=new THREE.Vector3(f.x,6.3,f.y).project(camera);
    const px=(v.x*.5+.5)*innerWidth,py=(-v.y*.5+.5)*innerHeight;
    // Um rótulo não pode cobrir outro nem invadir indicadores de interface.
    if(px<75||px>innerWidth-75||py<170||py>innerHeight-105||
       placed.some(p=>Math.abs(p.x-px)<154&&Math.abs(p.y-py)<31)){
      el.style.display='none';continue;
    }
    placed.push({x:px,y:py});
    el.style.display='block';
    el.style.transform='translate(-50%,-100%) translate('+px+'px,'+py+'px)';
    const icon=f.role==='tratador'?'🐎':f.role==='agricultor'?'🌾':'📋';
    const status=f.motion==='work'?'Em serviço':f.motion==='walk'?'Caminhando':'Aguardando';
    const label=icon+' '+f.role+' · '+status;
    if(el.textContent!==label)el.textContent=label;
  }
}
function animate(now=0,generation=renderGeneration){
  if(!enabled||generation!==renderGeneration)return;
  requestAnimationFrame(next=>animate(next,generation));
  const interval=innerWidth<=620?(appliedLowGraphics?45:32):
    (appliedLowGraphics?30:16);
  if(now>0&&now-lastFrameAt<interval)return;
  const elapsed=lastFrameAt>0?now-lastFrameAt:0;
  if(now>0)lastFrameAt=now;
  recordFrameTime(elapsed);
  try{
    const s=api.state(),zoom=s.zoom;
    if(appliedLowGraphics!==!!s.lowGraphics){
      appliedLowGraphics=!!s.lowGraphics;
      // Trocar qualidade não reinicia o contexto gráfico nem perde a câmera.
      detailMode=null;
      resolutionScale=1;
      slowWindows=0;fastWindows=0;
      applyAdaptiveResolution(appliedLowGraphics,true);
    }else applyAdaptiveResolution(!!s.lowGraphics);
    const scale=Math.min(innerWidth/300,innerHeight/260)*zoom;
    const hw=innerWidth/(2*scale),hh=innerHeight/(2*scale);
    camera.left=-hw;camera.right=hw;camera.top=hh;camera.bottom=-hh;camera.updateProjectionMatrix();
    const distance=350;
    // Em mapa regional usa câmera mais vertical; na fazenda usa oblíqua.
    // Saltos grandes de localização são instantâneos (não parecem câmera travada).
    if(!cameraInitialized){smoothCenter.set(s.panX,0,s.panY);cameraInitialized=true}
    const jump=Math.hypot(s.panX-smoothCenter.x,s.panY-smoothCenter.z);
    if(jump>140||s.cameraGesture){
      // Enquanto o usuário arrasta, câmera e projeção do toque são a mesma.
      smoothCenter.set(s.panX,0,s.panY);
    }else{
      smoothCenter.x+=(s.panX-smoothCenter.x)*.32;
      smoothCenter.z+=(s.panY-smoothCenter.z)*.32;
    }
    const regional=Math.max(0,Math.min(1,(.82-s.zoom)/.59));
    camera.position.set(
      smoothCenter.x+distance*(.47-regional*.40),
      distance*(.64+regional*.46),
      smoothCenter.z+distance*(.62-regional*.53)
    );
    camera.lookAt(smoothCenter.x,0,smoothCenter.z);
    sync(s);
    renderer.render(scene,camera);
    updateLabels(s);
    if(now-lastFrameReport>=900||!lastFrameReport){
      const perf=renderer.info?.render;
      if(api.reportPerformance)api.reportPerformance({
        mode:'3D',fps:elapsed>5?1000/elapsed:0,dpr:appliedDpr,
        calls:perf?.calls||0,triangles:perf?.triangles||0
      });
      lastFrameReport=now;
    }
  }catch(e){
    stop('3D indisponível: '+e.message);
    return;
  }
}
api.groundAt=(clientX,clientY)=>{
  if(!enabled||!camera)return null;
  const p=new THREE.Vector2(clientX/innerWidth*2-1,-(clientY/innerHeight)*2+1);
  groundRay.setFromCamera(p,camera);
  const hit=groundRay.ray.intersectPlane(groundPlane,groundHit);
  return hit?{x:hit.x,y:hit.z}:null;
};
function stop(reason){
  enabled=false;renderGeneration++;
  if(renderer)renderer.domElement.style.display='none';
  if(labelLayer)labelLayer.style.display='none';
  api.mode(false);
  btn.textContent='🌐 Ativar 3D';
  if(reason){fail.style.display='block';fail.textContent=reason+' · Modo 2D preservado.'}
}
function start(){
  if(!renderer||!scene||!labelLayer||contextInterrupted){
    fail.textContent='Three.js não inicializou ou o contexto está indisponível; modo 2D preservado.';return
  }
  if(enabled)return;
  enabled=true;lastFrameAt=0;cameraInitialized=false;
  const thisLoop=++renderGeneration;
  renderer.domElement.style.display='block';
  labelLayer.style.display='block';
  api.mode(true);
  btn.textContent='🗺️ Modo 2D';
  fail.textContent='🌄 Three.js ativo';
  fail.style.display='none';
  requestAnimationFrame(now=>animate(now,thisLoop));
}
function init(){
  const fresh=document.createElement('canvas');
  renderer=new THREE.WebGLRenderer({canvas:fresh,antialias:false,powerPreference:'low-power',alpha:false});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<=620?1.2:1.5));
  renderer.setSize(innerWidth,innerHeight);
  renderer.setClearColor(0x9ab8c9,1);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.domElement.style.cssText='position:fixed;inset:0;width:100vw;height:100dvh;pointer-events:none;z-index:0;';
  document.body.insertBefore(renderer.domElement,document.getElementById('hud'));
  renderer.domElement.addEventListener('webglcontextlost',e=>{
    e.preventDefault();contextInterrupted=true;
    stop('Contexto WebGL interrompido');
  });
  renderer.domElement.addEventListener('webglcontextrestored',()=>{
    contextInterrupted=false;detailMode=null;appliedDpr=0;
    lastTrailObject=null;lastRanchDecor=null;lastFairStamp='';
    start();
  });
  window.addEventListener('resize',()=>{
    if(renderer)applyAdaptiveResolution(!!appliedLowGraphics,true);
  });
  scene=new THREE.Scene();scene.background=new THREE.Color(colors.grass);scene.fog=new THREE.Fog(colors.grass,1500,2600);
  camera=new THREE.OrthographicCamera(-100,100,100,-100,.1,2400);
  scene.add(new THREE.HemisphereLight(0xe4f3fa,0x50664b,2.05));
  const sun=new THREE.DirectionalLight(0xffe5b9,1.55);sun.position.set(-210,310,180);scene.add(sun);
  const s=api.state();drawWorld(s);
  labelLayer=document.createElement('div');
  labelLayer.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:1';
  for(const o of s.owners){
    const el=document.createElement('div');el.textContent=o.name;
    el.style.cssText='position:absolute;top:0;left:0;white-space:nowrap;color:#fff7df;background:#1f3b28b9;border:1px solid #f7e5b04f;border-radius:8px;padding:3px 7px;font:600 11px system-ui;box-shadow:0 2px 6px #0004';
    labelLayer.appendChild(el);labelNodes.push(el);
  }
  fairLabel=document.createElement('div');
  fairLabel.style.cssText='position:absolute;left:0;top:0;white-space:nowrap;'+
    'color:#fff2c7;background:#314d39df;border:1px solid #e7cb87a8;'+
    'border-radius:10px;padding:4px 9px;font:700 11px system-ui;'+
    'box-shadow:0 2px 6px #0004;display:none';
  labelLayer.appendChild(fairLabel);
  for(const f of s.farmers){
    const el=document.createElement('div');
    el.style.cssText='position:absolute;left:0;top:0;white-space:nowrap;color:#fff4d1;background:#254635ee;border:1px solid #f1ddad9a;border-radius:10px;padding:3px 5px;font:600 10px system-ui;box-shadow:0 2px 6px #0004;display:none';
    labelLayer.appendChild(el);workerLabels.push({f,el});
  }
  document.body.insertBefore(labelLayer,document.getElementById('hud'));
  start();
}
btn.addEventListener('click',()=>enabled?stop():start());
try{init()}catch(e){stop('Falha ao iniciar 3D: '+e.message)}
