// Versão fixa, com espelho caso o CDN principal esteja indisponível.
let THREE;
try {
  THREE=await import('https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js');
} catch (err) {
  THREE=await import('https://unpkg.com/three@0.165.0/build/three.module.js');
}

/* Fazenda Viva 0.9.3 — criação de potros, eventos rurais e economia integrada ao mundo 3D.
 * O Canvas 2D continua funcionando caso import/WebGL falhe.
 * Controles, economia e reinício de partidas permanecem no index.html.
 */
window.FazendaViva3DReady=true;
const api = window.FazendaVivaBridge;
if (!api) throw Error('Simulação principal indisponível');
const btn = document.getElementById('renderMode');
const fail = document.getElementById('renderStatus');
let renderer, scene, camera, content, horseLayer, workerLayer, trailLayer, grassLayer;
let enabled = false, detailMode=null, trailStamp3D='', grassStamp3D='';
const modelsByBuilding=new Map();
let lastTrailObject=null,lastTrailLength=-1,lastGrassBuildings=-1,lastGrassTrails=null;
let workerLabels=[],last3DWorkersShown=0,appliedLowGraphics=null;
let smoothCenter=new THREE.Vector3(), cameraInitialized=false,lastFrameAt=0;
const groundRay=new THREE.Raycaster(), groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0), groundHit=new THREE.Vector3();
let labelLayer, labelNodes = [];
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
  const variety=(Math.abs(Math.round(b.x*17+b.y*23))%5);
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
  const facade=b.type==='house'?(variety%3===0?PALETTE.offwhite:b.o.color):
               b.type==='stable'?([0xcdb796,0xc0bca0,0xcebfa9,0xb8ac8a,0xc9c2ac][variety]):
               ([0xb4beb4,0xb7b7a5,0xb4b5aa,0xa8b3a5,0xb9c0af][variety]);
  const roofColor=b.type==='house'?([PALETTE.tile,PALETTE.tile2,0xa76347,0x9d614b,0x925342][variety]):
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
// Os pivôs ficam na articulação, não no centro das caixas. A fase da passada
// vem da distância realmente percorrida na simulação (mesma fonte do 2D).
function makeHorse(h){
  const group=new THREE.Group(),coat=mat(h.coat||0x81553d);
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
  group.userData.horse=h;
  group.userData.legs=legs;
  group.userData.neck=neckPivot;
  group.userData.tail=tailPivot;
  return group;
}
function makeWorker(f){
  const group=new THREE.Group(),skin=0xd6a17d,shirt=f.color||'#759389';
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
  const head=new THREE.Mesh(new THREE.SphereGeometry(.56,8,6),mat(skin));
  head.position.set(0,3.10,0);group.add(head);
  const brim=new THREE.Mesh(new THREE.CylinderGeometry(.85,.85,.12,10),mat(0xd4b477));
  brim.position.set(0,3.50,0);group.add(brim);
  cylinder(group,.44,.55,.51,0,3.75,0,0xbc995c,9);
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
  // Pátios e conexões internos são desenhados sem cruzar as baias.

  road(root,-140,-580,-140,580,14,.16);
  road(root,140,-580,140,580,14,.16);
  road(root,-580,140,580,140,14,.205);
  for(const o of s.owners){
    if(o.x<-100)road(root,o.x+122,o.y,-140,o.y,8,.235);
    else if(o.x>100)road(root,140,o.y,o.x-122,o.y,8,.235);
    else road(root,o.x,140,o.x,o.y+120,8,.235);
    ellipse(root,o.x,o.y,121,118,o.ai?0x91ae74:0xa0b779,.24);
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
  for(const p of s.ponds){
    ellipse(root,p.x,p.y,p.rx+3,p.ry+3,0xc1bb87,.38);
    ellipse(root,p.x,p.y,p.rx,p.ry,colors.water,.46);
    for(let i=0;i<12;i++){
      const a=(i*2.39996),x=p.x+(p.rx+1)*Math.cos(a),z=p.y+(p.ry+1)*Math.sin(a);
      cylinder(root,.35,.5,2.1,x,1.08,z,i%2?0x57833c:0x6c984e,5);
    }
  }
  makeTrees(root,s.trees);
  content=new THREE.Group();scene.add(content);
  horseLayer=new THREE.Group();scene.add(horseLayer);
  workerLayer=new THREE.Group();scene.add(workerLayer);
  trailLayer=new THREE.Group();scene.add(trailLayer);
  grassLayer=new THREE.Group();scene.add(grassLayer);
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
    const version=modelVersion(b,highDetail);
    const record=modelsByBuilding.get(b);
    if(record&&record.version===version)continue;
    if(record){
      content.remove(record.model);
      disposeTransientGroup(record.model);
    }
    const model=building(b,highDetail);
    content.add(model);
    modelsByBuilding.set(b,{model,version});
  }
  if(horseLayer.children.length!==s.horses.length){
    for(const child of [...horseLayer.children])horseLayer.remove(child);
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
      mesh.userData.neck.rotation.z=h.motion==='graze'?
        -.60+Math.sin(h.phase*.32)*.06:
        walking?Math.sin(gait*.5)*.08:-.05;
    if(mesh.userData.tail)
      mesh.userData.tail.rotation.z=-.18+Math.sin(h.phase*.48+h.id)*.14;
  });
  if(workerLayer.children.length!==s.farmers.length){
    for(const child of [...workerLayer.children])workerLayer.remove(child);
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
function animate(now=0){
  if(!enabled)return;
  requestAnimationFrame(animate);
  if(now>0&&now-lastFrameAt<(innerWidth<=620?(appliedLowGraphics?45:32):(appliedLowGraphics?30:16)))return;
  if(now>0)lastFrameAt=now;
  try{
    const s=api.state(),zoom=s.zoom;
    if(appliedLowGraphics!==!!s.lowGraphics){
      appliedLowGraphics=!!s.lowGraphics;
      const maxDpr=innerWidth<=620?(appliedLowGraphics?.85:1.2):(appliedLowGraphics?1:1.5);
      renderer.setPixelRatio(Math.min(devicePixelRatio||1,maxDpr));
      renderer.setSize(innerWidth,innerHeight);
      // Alternar o LOD não precisa reiniciar o renderizador WebGL.
      detailMode=null;
    }
    const scale=Math.min(innerWidth/300,innerHeight/260)*zoom;
    const hw=innerWidth/(2*scale),hh=innerHeight/(2*scale);
    camera.left=-hw;camera.right=hw;camera.top=hh;camera.bottom=-hh;camera.updateProjectionMatrix();
    const distance=350;
    // Em mapa regional usa câmera mais vertical; na fazenda usa oblíqua.
    // Saltos grandes de localização são instantâneos (não parecem câmera travada).
    if(!cameraInitialized){smoothCenter.set(s.panX,0,s.panY);cameraInitialized=true}
    const jump=Math.hypot(s.panX-smoothCenter.x,s.panY-smoothCenter.z);
    if(jump>140){smoothCenter.set(s.panX,0,s.panY)}
    else{
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
  enabled=false;
  if(renderer)renderer.domElement.style.display='none';
  if(labelLayer)labelLayer.style.display='none';
  api.mode(false);
  btn.textContent='🌐 Ativar 3D';
  if(reason){fail.style.display='block';fail.textContent=reason+' · Modo 2D preservado.'}
}
function start(){
  if(!renderer||!scene||!labelLayer){fail.textContent='Three.js não inicializou; o modo 2D continua disponível.';return}
  if(enabled)return;
  enabled=true;lastFrameAt=0;renderer.domElement.style.display='block';
  labelLayer.style.display='block';
  api.mode(true);
  btn.textContent='🗺️ Modo 2D';
  fail.textContent='🌄 Three.js ativo';
  fail.style.display='none';
  requestAnimationFrame(animate);
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
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();stop('Contexto gráfico interrompido')});
  window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight)});
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
