// Teste de regressão 3D sem WebGL real ou conexão de internet.
// node tests/render3d.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const routine=createRequire(import.meta.url)('../routine.js');
const motion=createRequire(import.meta.url)('../motion.js');
const world=readFileSync(new URL('../world3d.js',import.meta.url),'utf8');
const source=world.slice(world.indexOf('/* Fazenda Viva'));
assert.ok(source.startsWith('/* Fazenda Viva'));
const meshes=[],sceneObjects=[];
let renders=0,frame,modelsCreated=0;
const pixelRatios=[];
let rendererDom=null;
class Mock3D{
  constructor(...args){
    modelsCreated++;
    sceneObjects.push(this);
    this.args=args;this.geometry=args[0];this.material=args[1];
    this.children=[];this.userData={};this.style={};this.visible=true;
    this.domElement={style:{},listeners:{},addEventListener(type,fn){this.listeners[type]=fn}};
    this.position={x:0,y:0,z:0,set:(x,y,z)=>{
      Object.assign(this.position,{x,y,z});
    }};
    this.rotation={x:0,y:0,z:0,set:(x,y,z)=>{
      Object.assign(this.rotation,{x,y,z});
    }};
    this.scale={x:1,y:1,z:1,set:(x,y,z)=>{
      Object.assign(this.scale,{x,y,z});
    }};
    this.matrix={};this.instanceMatrix={};this.instanceColor={};
  }
  add(...items){this.children.push(...items)}
  remove(item){this.children=this.children.filter(c=>c!==item)}
  setAttribute(){}
  computeVertexNormals(){}
  setPixelRatio(value){pixelRatios.push(value);rendererDom=this.domElement}
  setSize(){}
  setClearColor(){}
  updateProjectionMatrix(){}
  lookAt(){}
  dispose(){}
  setColorAt(){}
  updateMatrix(){
    this.matrix={x:this.position.x,y:this.position.y,z:this.position.z,
      yaw:this.rotation.y,scaleX:this.scale.x,scaleZ:this.scale.z};
  }
  setMatrixAt(i,matrix){
    assert.ok(i>=0&&i<this.count,'matriz instanciada fora do limite');
    this.matrices[i]={...matrix};
  }
  render(){renders++}
  project(){this.x=.15;this.y=.15;return this}
}
class Vector extends Mock3D{
  constructor(x=0,y=0,z=0){super();this.x=x;this.y=y;this.z=z}
  set(x,y,z){Object.assign(this,{x,y,z})}
  project(){this.x=.15;this.y=.15;return this}
}
class Instances extends Mock3D{
  constructor(geometry,material,count){
    super(geometry,material);this.count=count;this.matrices=[];
    meshes.push(this);
  }
}
class Ray extends Mock3D{
  constructor(){
    super();
    this.ray={intersectPlane:(plane,point)=>{
      point.x=-315;point.z=-280;return point;
    }};
  }
  setFromCamera(){}
}
const Three=new Proxy({
  Vector3:Vector,Raycaster:Ray,InstancedMesh:Instances,
  SRGBColorSpace:'srgb',DoubleSide:2
},{get:(target,k)=>target[k]??Mock3D});
const ui=new Map(['hud','renderMode','renderStatus'].map(id=>
  [id,{style:{},textContent:'',listeners:{},addEventListener(type,fn){this.listeners[type]=fn}}]));
const owner={name:'Sua cabanha',x:-315,y:-280,color:'#b78355',ai:false};
const mk=(type,x,y,w,h)=>({
  o:owner,type,x,y,w,h,tier:1,status:'complete',progress:100
});
const state={
  owners:[owner],
  buildings:[
    mk('house',-315,-280,12,10),
    mk('stable',-285,-274,17,10),
    mk('paddock',-330,-249,20,16)
  ],
  horses:[{
    o:owner,id:1,x:-329,y:-249,motion:'graze',
    gait:1.1,heading:-.4,phase:8.1,coat:'#8b6245'
  }],
  farmers:[{
    o:owner,id:1,x:-310,y:-298,role:'agricultor',
    motion:'walk',gait:2.1,visualHeading:Math.PI/4,
    color:'#b18759',animTime:2.4
  }],
  // Diagonal concreta que regressava ao sinal invertido em 0.9.0.
  trails:[{
    x1:-310,y1:-298,x2:-290,y2:-278,
    owner:owner.name,kind:'principal',w:3.5
  },{
    x1:-310,y1:-298,x2:-310,y2:-280,
    owner:owner.name,kind:'servico',w:2.5
  }],
  trees:[],ponds:[],fields:[{x:390,y:320,w:40,h:28}],
  fairground:{x:-65,y:212},ruralEvent:null,
  ranchDecor:[
    {o:owner,x:-260,y:-220,kind:'arvore',scale:1,variant:0,color:0x648c50},
    {o:owner,x:-258,y:-240,kind:'arbusto',scale:1.2,variant:1,color:0x648c50},
    {o:owner,x:-260,y:-260,kind:'flores',scale:1.0,variant:2,color:0x648c50},
    {o:owner,x:-290,y:-205,kind:'feno',scale:1.1,variant:3,color:0x648c50},
    {o:owner,x:-300,y:-204,kind:'pedra',scale:1,variant:4,color:0x648c50}
  ],
  panX:-315,panY:-280,zoom:3,
  lowGraphics:false
};
const previous=new Map();
const mocks={
  window:{FazendaVivaRoutine:routine,FazendaVivaMotion:motion,FazendaVivaBridge:{state:()=>state,mode(){}},addEventListener(){}},
  document:{
    body:{insertBefore(){}},
    createElement:()=>({style:{},textContent:'',appendChild(){},addEventListener(){}}),
    getElementById:id=>ui.get(id)||ui.get('hud')
  },
  innerWidth:390,innerHeight:844,devicePixelRatio:2,
  requestAnimationFrame:callback=>{frame=callback}
};
for(const [k,v]of Object.entries(mocks)){
  previous.set(k,globalThis[k]);globalThis[k]=v;
}
try{
  new Function('THREE',source)(Three);
  assert.equal(typeof frame,'function',
    'Three.js deve iniciar e agendar renderização');
  for(const t of [40,80,120,160])frame(t);
  assert.ok(renders>=3,'quadros 3D renderizados');
  const diagonals=meshes.flatMap(m=>m.matrices).filter(m=>
    m&&Math.abs(m.yaw-Math.PI/4)<1e-4);
  assert.ok(diagonals.length>=2,
    'trilha diagonal deve seguir vetor real +atan2(dx,dz)');
  assert.ok(state.farmers[0].motion==='walk'&&state.horses[0].motion==='graze');
  state.horses[0].motion='walk';state.horses[0].gait+=2;
  state.farmers[0].motion='work';state.farmers[0].animTime+=2;
  frame(200);
  state.trails=[...state.trails,{
    x1:-320,y1:-295,x2:-330,y2:-310,w:2.5,
    owner:owner.name,kind:'servico'
  }];
  frame(240);
  state.lowGraphics=true;frame(280);
  state.zoom=.33;frame(320);
  assert.ok(renders>=7,'3D deve resistir a zoom e troca de qualidade');
  assert.ok(meshes.some(m=>m.count===77&&m.matrices.length===77),
    'lavouras instanciadas sem centenas de meshes soltos');
  assert.ok(meshes.filter(m=>m.count===1&&m.matrices.length===1).length>=5,
    'camada rural física deve instanciar vegetação e objetos distintos');
  const decorCached=modelsCreated;
  frame(340);
  assert.ok(modelsCreated-decorCached<12,
    'paisagismo orgânico deve permanecer em cache sem mudanças no terreno');

  const beforeEvent=modelsCreated;
  state.ruralEvent={id:'feira',name:'Feira regional de criadores',claimed:false};
  frame(420);
  assert.ok(modelsCreated-beforeEvent>45,
    'feira deve gerar tendas tridimensionais ao abrir');
  const cached=modelsCreated;
  frame(480);
  assert.ok(modelsCreated-cached<12,
    'tendas devem permanecer em cache quando evento não muda');
  state.ruralEvent={id:'insumos',name:'Central de suprimentos',claimed:false};
  const beforeSecond=modelsCreated;
  frame(540);
  assert.ok(modelsCreated-beforeSecond>45,
    'mudanças econômicas devem atualizar os estandes 3D');
  state.lowGraphics=false;
  frame(600);
  assert.ok(renders>=10,'eventos e troca de qualidade não devem parar renderização');
  // Em um aparelho lento (intervalos de 80 ms), o DPR precisa cair em passos
  // discretos sem destruir a cena ou reiniciar o contexto.
  const baselineDpr=pixelRatios.at(-1);
  for(let i=1;i<=130;i++)frame(600+i*80);
  assert.ok(pixelRatios.some(v=>v<baselineDpr-.06),
    'qualidade adaptativa deve reduzir resolução interna em quadros lentos');
  const beforeStop=renders;
  const staleFrame=frame;
  ui.get('renderMode').listeners.click();
  staleFrame(20000);
  assert.equal(renders,beforeStop,'RAF antigo não pode continuar após mudar para 2D');
  ui.get('renderMode').listeners.click();
  frame(20050);
  const restarted=renders;
  staleFrame(20100);
  assert.equal(renders,restarted,'RAF anterior não pode duplicar desenhos após voltar ao 3D');
  assert.ok(renders>beforeStop,'volta ao 3D deve retomar o renderizador');
  assert.equal(typeof rendererDom.listeners.webglcontextlost,'function',
    'deve inscrever-se à perda de contexto WebGL');
  let prevented=false;
  rendererDom.listeners.webglcontextlost({preventDefault(){prevented=true}});
  assert.ok(prevented,'interrupção WebGL precisa chamar preventDefault');
  const stoppedAt=renders;
  frame(20200);
  assert.equal(renders,stoppedAt,
    'desenho não deve continuar após perder WebGL');
  rendererDom.listeners.webglcontextrestored();
  frame(20300);
  assert.ok(renders>stoppedAt,
    'renderização deve reiniciar após restauração do contexto');
  state.zoom=3;state.lowGraphics=false;
  state.horses[0].interacting=true;
  state.horses[0].careSpecialUntil=state.horses[0].phase+2;
  frame(20400);
  const horseModel=sceneObjects.find(m=>m.userData.horse===state.horses[0]);
  assert.ok(horseModel&&horseModel.userData.careFx,
    'cavalo precisa de representação tridimensional do cuidado');
  assert.ok(horseModel.userData.careFx.visible,
    'cavalo em atendimento mostra indicador no mapa');
  assert.ok(horseModel.userData.specialCareFx.visible,
    'ração especial mostra folha dourada no 3D');
  state.horses[0].interacting=false;
  state.horses[0].careSpecialUntil=-1;
  state.horses[0].careEffectUntil=-1;
  frame(20500);
  assert.equal(horseModel.userData.careFx.visible,false,
    'efeito do manejo desaparece ao concluir');
  state.horses[0].careEffectUntil=state.horses[0].phase+2;
  frame(20600);
  assert.ok(horseModel.userData.careFx.visible,
    'efeito de conclusão mantém destaque temporário');
  // Trocar um animal por outro sem alterar o tamanho do plantel deve mudar o
  // modelo físico — antes a malha reaproveitava a pelagem do cavalo vendido.
  const replacement={...state.horses[0],id:88,coat:'#c69a64',
    interacting:false,careEffectUntil:-1,careSpecialUntil:-1};
  state.horses=[replacement];
  frame(20700);
  const newer=sceneObjects.find(model=>model.userData.horse===replacement);
  assert.ok(newer&&newer!==horseModel,
    'identidade 3D deve acompanhar o cavalo após compra/venda de mesmo tamanho');




  assert.ok(!ui.get('renderStatus').textContent.includes('indisponível'),
    'renderizador não pode desativar por erro');
  console.log('PASS world3d',JSON.stringify({
    frames:renders,instanced:meshes.length,
    crops:'instanced',fairground:'event-responsive',
    diagonals:diagonals.length,
    horse:'idle/walk/graze',worker:'walk/work',roadRotations:'OK'
  }));
}finally{
  for(const [k,v]of previous)if(v===undefined)delete globalThis[k];
  else globalThis[k]=v;
}
