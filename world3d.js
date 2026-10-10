// Versão fixa, com espelho caso o CDN principal esteja indisponível.
let THREE;
try {
  THREE=await import('https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js');
} catch (err) {
  THREE=await import('https://unpkg.com/three@0.165.0/build/three.module.js');
}

/* Fazenda Viva 0.8 — renderizador WebGL progressivo.
 * O Canvas 2D continua funcionando caso import/WebGL falhe.
 * Todos os controles, economia e salvamento seguem no index.html.
 */
window.FazendaViva3DReady=true;
const api = window.FazendaVivaBridge;
if (!api) throw Error('Simulação principal indisponível');
const btn = document.getElementById('renderMode');
const fail = document.getElementById('renderStatus');
let renderer, scene, camera, content, horseLayer;
let enabled = false, stamp = '';
let labelLayer, labelNodes = [];
const colors = {
  grass: 0x83a968, grass2: 0x9bb97b, earth: 0xb8a17a,
  fence: 0xc9a775, timber: 0x806042, path: 0xc5aa86,
  water: 0x629ba1, crop: 0xb0a76c, tree: 0x487c40
};
const materials = new Map();
function mat(color, roughness=1) {
  const key = String(color)+':'+roughness;
  if (!materials.has(key)) materials.set(key,new THREE.MeshLambertMaterial({color,side:THREE.DoubleSide}));
  return materials.get(key);
}
function box(parent,w,h,d,x,y,z,color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));
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
function building(b){
  const g=new THREE.Group();g.position.set(b.x,0,b.y);
  const w=b.w,d=b.h,t=Math.max(1,Math.min(3,b.tier||1));
  if(b.type==='paddock'){
    flat(g,w-1,d-1,0,0,0x7ba45b,.09);
    rails(g,w,d,0xdbbd85);
    for(let i=0;i<2;i++){
      cylinder(g,1.05,1.2,1.1,-w*.2+i*5,.6,d*.15,0xbf9a58,8);
    }
  } else {
    flat(g,w+1,d+1,0,0,0xaf9774,.10);
    // O terreno reservado é a dimensão total da estrutura. Os módulos ampliados ocupam
    // espaços já reservados, sem invadir outra construção.
    const activeW=w*(.56+.22*(t-1));
    const sideColor=b.type==='house'?b.o.color:b.type==='stable'?0xd1b28b:0xb8aca0;
    const high=b.type==='barn'?6.8:b.type==='stable'?5.2:5.8;
    box(g,activeW,high,d*.82,0,high/2,0,sideColor);
    roof(g,activeW+1.8,d*.95,high,high+(b.type==='house'?3:2.1),
         b.type==='house'?0x984f39:b.type==='stable'?0x76523b:0x666c69);
    box(g,activeW*.2,high*.62,.22,-activeW*.27,high*.31,d*.42,0x604332);
    if(b.type==='stable'){
      const stalls=t+1;
      for(let j=0;j<stalls;j++) {
        const xx=-activeW*.32+j*(activeW*.64/Math.max(1,stalls-1));
        box(g,activeW/(stalls+2),high*.55,.25,xx,high*.28,d*.43,0x69482c);
        box(g,activeW/(stalls+3),.32,.32,xx,high*.56,d*.45,0xd7b17f);
      }
    }else if(b.type==='house'){
      for(let k of [-1,1]) {
        box(g,2.2,2,.24,k*activeW*.3,high*.63,d*.43,0x90b7af);
        box(g,.22,2,.28,k*activeW*.3,high*.63,d*.46,0xe8d6b1);
      }
      box(g,activeW*.58,.26,d*.2,0,.35,d*.53,0xc5a37c);
    }else{
      for(let k=-1;k<=1;k++)
        box(g,activeW*.15,high*.52,.25,k*activeW*.25,high*.28,d*.43,0x6e777b);
    }
    if(t>1) {
      for(let k=0;k<t-1;k++){
        const x=activeW*.5-.7-k*1.5;
        box(g,1.1,2.5,.3,x,1.6,d*.45,0xe0b77c);
      }
    }
  }
  g.userData.building=b;return g;
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
  flat(root,1320,1220,0,0,colors.grass,.0);
  // grandes manchas de vegetação, evitando o antigo retângulo pequeno isolado
  for(let i=0;i<90;i++){
    const x=(i*317.21%1160)-580,z=(i*193.39%1060)-530;
    flat(root,25+(i%5)*11,24+(i%4)*14,x,z,i%3===0?0x83aa6b:0x8daf76,.09);
  }
  road(root,-140,-580,-140,580,14);
  road(root,140,-580,140,580,14);
  road(root,-580,140,580,140,14);
  for(const o of s.owners){
    const lx=o.x<-100?-140:o.x>100?140:o.x;
    if(o.x!==lx)road(root,o.x,o.y,lx,o.y,8);
    road(root,lx,o.y,lx,140,8);
    ellipse(root,o.x,o.y,121,118,o.ai?0x91ae74:0xa0b779);
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
  for(const p of s.ponds)ellipse(root,p.x,p.y,p.rx,p.ry,colors.water);
  makeTrees(root,s.trees);
  content=new THREE.Group();scene.add(content);
  horseLayer=new THREE.Group();scene.add(horseLayer);
}
function sync(s){
  const newStamp=s.buildings.map(b=>[b.type,b.x,b.y,b.tier||1,s.owners.indexOf(b.o)].join(':')).join('|');
  if(newStamp!==stamp){
    for(const child of [...content.children])content.remove(child);
    for(const b of s.buildings)content.add(building(b));
    stamp=newStamp;
  }
  if(horseLayer.children.length!==s.horses.length){
    horseLayer.clear();
    for(const h of s.horses)horseLayer.add(makeHorse(h));
  }
  s.horses.forEach((h,i)=>{
    const mesh=horseLayer.children[i];
    if(!mesh)return;
    const dx=Math.cos(h.phase)*12+(h.offset||0),dz=12+Math.sin(h.phase)*9;
    mesh.position.set(h.o.x+dx,.18,h.o.y+dz);
    mesh.rotation.y=-h.phase+.6;
  });
}
function updateLabels(s){
  for(let i=0;i<s.owners.length;i++){
    const o=s.owners[i],p=new THREE.Vector3(o.x,10,o.y).project(camera);
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
    const distance=300;
    camera.position.set(s.panX,distance*.66,s.panY+distance*.75);
    camera.lookAt(s.panX,0,s.panY);
    sync(s);
    renderer.render(scene,camera);
    updateLabels(s);
  }catch(e){
    stop('3D indisponível: '+e.message);
    return;
  }
  requestAnimationFrame(animate);
}
function stop(reason){
  enabled=false;
  if(renderer)renderer.domElement.style.display='none';
  if(labelLayer)labelLayer.style.display='none';
  api.mode(false);
  btn.textContent='🌐 Ativar 3D';
  if(reason)fail.textContent=reason+' · Modo 2D preservado.';
}
function start(){
  if(!renderer||!scene||!labelLayer){fail.textContent='Three.js não inicializou; o modo 2D continua disponível.';return}
  if(enabled)return;
  enabled=true;renderer.domElement.style.display='block';
  labelLayer.style.display='block';
  api.mode(true);
  btn.textContent='🗺️ Modo 2D';
  fail.textContent='🌄 Three.js ativo';
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
  scene=new THREE.Scene();scene.background=new THREE.Color(0x9bbfc9);scene.fog=new THREE.Fog(0x9bbfc9,850,1800);
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
