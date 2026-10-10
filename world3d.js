// Versão fixa, com espelho caso o CDN principal esteja indisponível.
let THREE;
try {
  THREE=await import('https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js');
} catch (err) {
  THREE=await import('https://unpkg.com/three@0.165.0/build/three.module.js');
}

/* Fazenda Viva 0.8.2 — arquitetura rural detalhada e LOD.
 * O Canvas 2D continua funcionando caso import/WebGL falhe.
 * Todos os controles, economia e salvamento seguem no index.html.
 */
window.FazendaViva3DReady=true;
const api = window.FazendaVivaBridge;
if (!api) throw Error('Simulação principal indisponível');
const btn = document.getElementById('renderMode');
const fail = document.getElementById('renderStatus');
let renderer, scene, camera, content, horseLayer;
let enabled = false, stamp = '',detailMode=null;
let smoothCenter=new THREE.Vector3(), cameraInitialized=false;
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
function flat(parent,w,d,x,z,color,y=.08) {
  return box(parent,w,.13,d,x,y,z,color);
}
function cylinder(parent,rTop,rBottom,h,x,y,z,color,segments=7) {
  const m=new THREE.Mesh(new THREE.CylinderGeometry(rTop,rBottom,h,segments),mat(color));
  m.position.set(x,y,z);parent.add(m);return m;
}
function ellipse(parent,x,z,rx,rz,color) {
  const m=new THREE.Mesh(new THREE.CircleGeometry(1,28),mat(color));
  m.rotation.x=-Math.PI/2;m.position.set(x,.14,z);m.scale.set(rx,rz,1);parent.add(m);return m;
}
function road(parent,x1,z1,x2,z2,width=9) {
  const dx=x2-x1,dz=z2-z1,dist=Math.hypot(dx,dz);
  const m=flat(parent,width,dist,(x1+x2)/2,(z1+z2)/2,colors.path,.085);
  m.rotation.y=Math.atan2(-dx,dz);
}
function roof(parent,w,d,h,ridgeY,color) {
  const verts = new Float32Array([
    -w/2,h,-d/2, w/2,h,-d/2, -w/2,ridgeY,0,
    w/2,h,-d/2, w/2,ridgeY,0, -w/2,ridgeY,0,
    -w/2,ridgeY,0, w/2,ridgeY,0, -w/2,h,d/2,
    w/2,ridgeY,0, w/2,h,d/2, -w/2,h,d/2
  ]);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(verts,3));geo.computeVertexNormals();
  const m=new THREE.Mesh(geo,mat(color));parent.add(m);
  // front and back triangular gables
  for(let sign of [-1,1]){
    const triangle=new THREE.BufferGeometry();
    triangle.setAttribute('position',new THREE.Float32BufferAttribute([
      -w/2,h,sign*d/2, w/2,h,sign*d/2, 0,ridgeY,sign*d/2
    ],3));triangle.computeVertexNormals();
    parent.add(new THREE.Mesh(triangle,mat(color)));
  }
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
  const variety=(Math.abs(Math.round(b.x*17+b.y*23))%5);
  const pad=detail?0.65:.2;
  if(b.type==='paddock'){
    flat(group,w-.6,d-.6,0,0,variety%2?0x78a05a:0x85a963,.09);
    rails(group,w-.7,d-.7,PALETTE.lightWood);
    if(detail){
      // Cochos discretos, bebedouro e capim no interior do piquete.
      box(group,2.2,.72,.95,-w*.27,.5,d*.24,0x98734f);
      box(group,2.6,.45,1,w*.25,.48,-d*.29,0x638f9c);
      for(let i=0;i<3;i++){
        const x=-w*.16+i*1.7,z=d*.10+Math.sin(i)*2;
        cylinder(group,.38,.54,.7,x,.45,z,0x719852,5);
      }
    }
    group.userData.building=b;return group;
  }
  const usedW=Math.min(w-.45,w*(.54+.22*(t-1)));
  const usedD=d-.55;
  const height=b.type==='barn'?6.7:b.type==='stable'?5.5:5.8;
  const facade=b.type==='house'?(variety%3===0?PALETTE.offwhite:b.o.color):
               b.type==='stable'?(variety%2===0?0xcdb796:0xbda184):
               (variety%2===0?0xb4beb4:0xa8a999);
  const roofColor=b.type==='house'?(variety%2===0?PALETTE.tile:PALETTE.tile2):
                  b.type==='stable'?0x79543e:PALETTE.metal;
  const zFront=usedD*.50;
  flat(group,w-.1,d-.1,0,0,variety%2===0?0xbca17c:0xa8987f,.11);
  // Plataforma e edifício contidos integralmente no lote: nenhum telhado ultrapassa o footprint.
  box(group,usedW,height,usedD*.88,0,height*.5,-.2,facade);
  roof(group,usedW+.25,usedD*.99,height,height+(b.type==='house'?2.9:2.0),roofColor);
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
  }
  // Ampliações físicas ocorrem dentro da reserva original (níveis 2 e 3).
  if(t>1)for(let j=0;j<t-1;j++){
    const x=usedW*.5-1.1-j*1.4;
    box(group,.30,2.5,.32,x,1.25,front+.19,PALETTE.lightWood);
  }
  group.userData.building=b;return group;
}
function makeHorse(h){
  const group=new THREE.Group();
  const coat = mat(h.coat||0x81553d);
  const part=(w,y,d,x,py,z)=>{let m=new THREE.Mesh(new THREE.BoxGeometry(w,y,d),coat);m.position.set(x,py,z);group.add(m)};
  part(3.8,1.5,1.4,0,2.3,0);
  part(1.1,2,1.0,1.45,2.9,-.05);
  part(1.2,.9,1.1,1.85,3.75,0);
  for(let x of [-1.25,1.25]) for(let z of [-.48,.48]) part(.35,1.7,.32,x,.9,z);
  const tail=box(group,.38,1.2,.4,-2.15,2.05,0,0x49382c);
  tail.rotation.z=-.3;
  group.userData.horse=h;
  return group;
}
function makeTrees(parent,trees){
  const n=trees.length;
  const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.62,.9,3.8,6),mat(colors.timber),n);
  const crowns=new THREE.InstancedMesh(new THREE.ConeGeometry(4.8,10,7),mat(colors.tree),n);
  const crowns2=new THREE.InstancedMesh(new THREE.ConeGeometry(3.7,7,7),mat(0x63904b),n);
  const dummy=new THREE.Object3D();
  trees.forEach((tree,i)=>{
    const scale=tree.s*.95;
    dummy.position.set(tree.x,1.8*scale,tree.y);dummy.scale.set(scale,scale,scale);dummy.updateMatrix();
    trunks.setMatrixAt(i,dummy.matrix);
    dummy.position.y=7.8*scale;dummy.updateMatrix();crowns.setMatrixAt(i,dummy.matrix);
    dummy.position.y=11.2*scale;dummy.updateMatrix();crowns2.setMatrixAt(i,dummy.matrix);
  });
  trunks.instanceMatrix.needsUpdate=true;crowns.instanceMatrix.needsUpdate=true;crowns2.instanceMatrix.needsUpdate=true;
  parent.add(trunks,crowns,crowns2);
}
function drawWorld(s){
  const root=new THREE.Group(); scene.add(root);
  // O plano deve ocupar toda a extensão visível em zoom regional — sem bordas azuis.
  flat(root,3600,3400,0,0,colors.grass,-.12);
  // Grandes manchas de pastagem orgânica. Evita quadrados escuros perfeitamente repetidos.
  const rng=(n)=>{const v=Math.sin(n*93.174+8.32)*43758.5453;return v-Math.floor(v)};
  for(let i=0;i<155;i++){
    const x=rng(i*3)*3000-1500,z=rng(i*3+1)*2800-1400;
    const rx=24+rng(i+91)*70,rz=22+rng(i+134)*59;
    ellipse(root,x,z,rx,rz,i%4===0?0x93b277:i%3===0?0x80a268:0x87aa6c);
  }
  // Pátios e conexões internos são desenhados sem cruzar as baias.

  road(root,-140,-580,-140,580,14);
  road(root,140,-580,140,580,14);
  road(root,-580,140,580,140,14);
  for(const o of s.owners){
    if(o.x<-100)road(root,o.x+122,o.y,-140,o.y,8);
    else if(o.x>100)road(root,140,o.y,o.x-122,o.y,8);
    else road(root,o.x,140,o.x,o.y+120,8);
    ellipse(root,o.x,o.y,121,118,o.ai?0x91ae74:0xa0b779);
    // Solo compactado junto à entrada, sem passar por baixo das estruturas.
    const entranceX=o.x<-100?o.x+112:o.x>100?o.x-112:o.x;
    const entranceY=Math.abs(o.x)<100?o.y+112:o.y;
    ellipse(root,entranceX,entranceY,8,7,0xbaa17b);
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
  for(const f of s.fields){
    flat(root,f.w,f.h,f.x,f.y,colors.crop,.15);
    for(let i=-3;i<=3;i++)flat(root,1.2,f.h-3,f.x+i*f.w/8,f.y,0x6d8f4c,.23);
  }
  for(const p of s.ponds){
    ellipse(root,p.x,p.y,p.rx+2,p.ry+2,0xc1bb87);
    ellipse(root,p.x,p.y,p.rx,p.ry,colors.water);
    for(let i=0;i<12;i++){
      const a=(i*2.39996),x=p.x+(p.rx+1)*Math.cos(a),z=p.y+(p.ry+1)*Math.sin(a);
      cylinder(root,.35,.5,2.1,x,1.08,z,i%2?0x57833c:0x6c984e,5);
    }
  }
  makeTrees(root,s.trees);
  content=new THREE.Group();scene.add(content);
  horseLayer=new THREE.Group();scene.add(horseLayer);
}
function sync(s){
  const highDetail=s.zoom>=.72;
  const newStamp=(highDetail?'H':'L')+'|'+s.buildings.map(b=>[b.type,b.x,b.y,b.tier||1,s.owners.indexOf(b.o)].join(':')).join('|');
  if(newStamp!==stamp){
    // Reutilização das geometrias básicas reduz picos de alocação durante a simulação.
    for(const child of [...content.children])content.remove(child);
    for(const b of s.buildings)content.add(building(b,highDetail));
    stamp=newStamp;
  }
  if(horseLayer.children.length!==s.horses.length){
    for(const child of [...horseLayer.children])horseLayer.remove(child);
    for(const h of s.horses)horseLayer.add(makeHorse(h));
  }
  // Cada cavalo fica no piquete ou perto da cocheira da própria cabanha.
  // Distribuir por baia, não pela origem global, evita animais soltos em estradas.
  const groups=new Map();
  s.horses.forEach((h,i)=>{if(!groups.has(h.o))groups.set(h.o,[]);groups.get(h.o).push(i)});
  for(const [owner,indices] of groups){
    const paddocks=s.buildings.filter(b=>b.o===owner&&b.type==='paddock');
    const stables=s.buildings.filter(b=>b.o===owner&&b.type==='stable');
    indices.forEach((horseIndex,j)=>{
      const h=s.horses[horseIndex],mesh=horseLayer.children[horseIndex];
      if(!mesh)return;
      let x,z;
      if(paddocks.length){
        const paddock=paddocks[Math.floor(j/5)%paddocks.length];
        const slot=j%5,cols=[[-.23,-.24],[.22,-.24],[-.23,.22],[.22,.22],[0,0]];
        const space=cols[slot];
        x=paddock.x+paddock.w*space[0]+Math.cos(h.phase*.23+j)*.8;
        z=paddock.y+paddock.h*space[1]+Math.sin(h.phase*.23+j)*.6;
      }else if(stables.length){
        const stable=stables[j%stables.length];
        x=stable.x+(j%3-1)*4;
        z=stable.y+stable.h*.69+2.3+Math.floor(j/3)*4;
      }else{
        x=owner.x+Math.cos(j*2.4)*18;z=owner.y+Math.sin(j*2.4)*15;
      }
      mesh.position.set(x,.1,z);
      mesh.rotation.y=Math.sin(h.phase*.27+j)*.4;
    });
  }
}
function updateLabels(s){
  for(let i=0;i<s.owners.length;i++){
    const o=s.owners[i];
    // Em zoom de detalhe as etiquetas não devem esconder telhados nem cavalos.
    if(s.zoom>1.13){labelNodes[i].style.display='none';continue}
    const p=new THREE.Vector3(o.x,14,o.y-40).project(camera);
    const x=(p.x*.5+.5)*innerWidth, y=(-p.y*.5+.5)*innerHeight;
    const label=labelNodes[i];
    label.style.transform='translate(-50%,-50%) translate('+x+'px,'+y+'px)';
    label.style.display=x<0||x>innerWidth||y<95||y>innerHeight-55?'none':'block';
  }
}
function animate(){
  if(!enabled)return;
  try{
    const s=api.state(),zoom=s.zoom;
    const scale=Math.min(innerWidth/300,innerHeight/260)*zoom;
    const hw=innerWidth/(2*scale),hh=innerHeight/(2*scale);
    camera.left=-hw;camera.right=hw;camera.top=hh;camera.bottom=-hh;camera.updateProjectionMatrix();
    const distance=350;
    // Ortográfica oblíqua: preserva a legibilidade 3D e evita quase-top-down.
    if(!cameraInitialized){smoothCenter.set(s.panX,0,s.panY);cameraInitialized=true}
    smoothCenter.x+=(s.panX-smoothCenter.x)*.18;
    smoothCenter.z+=(s.panY-smoothCenter.z)*.18;
    camera.position.set(smoothCenter.x+distance*.47,distance*.64,smoothCenter.z+distance*.62);
    camera.lookAt(smoothCenter.x,0,smoothCenter.z);
    sync(s);
    renderer.render(scene,camera);
    updateLabels(s);
  }catch(e){
    stop('3D indisponível: '+e.message);
    return;
  }
  requestAnimationFrame(animate);
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
  enabled=true;renderer.domElement.style.display='block';
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
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
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
    let el=document.createElement('div');el.textContent=o.name;
    el.style.cssText='position:absolute;top:0;left:0;white-space:nowrap;color:#fff7df;background:#1f3b28b9;border:1px solid #f7e5b04f;border-radius:8px;padding:3px 7px;font:600 11px system-ui;box-shadow:0 2px 6px #0004';
    labelLayer.appendChild(el);labelNodes.push(el);
  }
  document.body.insertBefore(labelLayer,document.getElementById('hud'));
  start();
}
btn.addEventListener('click',()=>enabled?stop():start());
try{init()}catch(e){stop('Falha ao iniciar 3D: '+e.message)}
