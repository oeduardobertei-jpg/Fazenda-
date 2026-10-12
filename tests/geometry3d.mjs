// Three.js de verdade, sem GPU: valida matrizes, articulações e buffers.
// A renderização WebGL é verificada separadamente em browser.mjs.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import * as Three from 'three';
const routine=createRequire(import.meta.url)('../routine.js');
const motion=createRequire(import.meta.url)('../motion.js');
const terrain=createRequire(import.meta.url)('../terrain.js');
const world=readFileSync(new URL('../world3d.js',import.meta.url),'utf8');
const source=world.slice(world.indexOf('/* Fazenda Viva'));
const owner={name:'Teste',x:0,y:0,color:'#b78355',style:{wall:0xe2cbac,roof:0x98543e,ground:0xa6b98a,leaf:0x607e4a},ai:false};
const horse={o:owner,id:1,x:0,y:23,coat:'#78513b',motion:'walk',gait:0,phase:0,age:4};
const worker={o:owner,id:1,x:-10,y:-20,role:'agricultor',motion:'walk',gait:0,animTime:0};
const building={o:owner,type:'house',x:0,y:0,w:12,h:10,status:'complete',tier:1};
const state={owners:[owner],buildings:[building],horses:[horse],farmers:[worker],
  trees:[],fields:[],ponds:[],trails:[],ranchDecor:[],zoom:3,panX:0,panY:0,day:1};
state.terrain=terrain.generate(state);
let scene,frame;
const noop=()=>{};
const ui={style:{},textContent:'',addEventListener:noop};
class Renderer{
  constructor(){this.domElement={style:{},addEventListener:noop};this.info={render:{}}}
  setPixelRatio(){}setSize(){}setClearColor(){}
  render(s,c){scene=s;s.updateMatrixWorld(true);c.updateMatrixWorld(true)}
}
const previous=new Map();
for(const [key,value] of Object.entries({
  window:{FazendaVivaRoutine:routine,FazendaVivaMotion:motion,FazendaVivaTerrain:terrain,FazendaVivaBridge:{state:()=>state,mode:noop},addEventListener:noop},
  document:{getElementById:()=>ui,body:{insertBefore:noop},createElement:()=>({...ui,style:{},appendChild:noop})},
  innerWidth:390,innerHeight:844,devicePixelRatio:2,requestAnimationFrame:f=>frame=f
})){
  previous.set(key,globalThis[key]);globalThis[key]=value;
}
try{
  new Function('THREE',source)({...Three,WebGLRenderer:Renderer});
  let now=40;
  for(let i=0;i<90;i++){motion.blend(horse,1/60);motion.blend(worker,1/60);frame(now+=40)}
  assert.ok(scene,'cena real Three.js deve ser construída');
  let textured=0;
  scene.traverse(obj=>{
    if(!obj.isMesh||!obj.material.map)return;
    textured++;
    assert.equal(obj.geometry.getAttribute('uv')?.count,obj.geometry.getAttribute('position').count,
      'fusão de malhas texturizadas deve preservar UVs para todos os vértices');
  });
  assert.ok(textured>=3,'chão e manchas devem receber a textura de grão');
  let horseModel,workerModel,houseModel;
  scene.traverse(obj=>{
    if(obj.userData.horse===horse)horseModel=obj;
    if(obj.userData.boots)workerModel=obj;
    if(obj.userData.building===building)houseModel=obj;
  });
  assert.ok(horseModel&&workerModel&&houseModel,'modelos devem existir');
  assert.equal(workerModel.userData.elbows.length,2,'dois cotovelos articulados');
  assert.ok(workerModel.userData.upper,'tronco deve permitir postura de trabalho');
  let indexed=0;
  scene.traverse(obj=>{if(obj.isMesh&&obj.geometry.index)indexed++});
  assert.ok(indexed>15,'volumes compartilhados devem usar vértices indexados para iluminação suave');
  assert.ok(houseModel.children.length<22,'peças estáticas devem ser fundidas por material');
  const barrel=new Three.Box3().setFromObject(horseModel.userData.body);
  const skull=new Three.Box3().setFromObject(horseModel.userData.head);
  assert.ok(skull.max.y-barrel.max.y<1.20,'cabeça não deve voltar à silhueta de pescoço excessivamente alto');
  assert.ok(skull.max.z-skull.min.z>.60,'cabeça deve conservar mandíbula e largura legíveis de frente');
  let lowest=Infinity,highest=0;
  for(let i=0;i<64;i++){
    horse.gait=i*Math.PI/32;worker.gait=horse.gait;frame(now+=40);
    for(const hoof of horseModel.userData.hooves){
      const box=new Three.Box3().setFromObject(hoof);
      lowest=Math.min(lowest,box.min.y);highest=Math.max(highest,box.min.y);
      assert.ok(box.min.y>=.418,'casco não pode penetrar o solo/piquete');
    }
    for(const boot of workerModel.userData.boots){
      const box=new Three.Box3().setFromObject(boot);
      assert.ok(box.min.y>=.418,'botas não podem penetrar o solo');
    }
  }
  assert.ok(highest-lowest>.20,'cascos alternam apoio e elevação');
  horse.motion='graze';
  for(let i=0;i<120;i++){
    motion.blend(horse,1/60);frame(now+=40);
    assert.ok(new Three.Box3().setFromObject(horseModel.userData.muzzle).min.y>=.40,
      'transição completa para pasto deve preservar o focinho acima do chão');
  }
  const muzzle=new Three.Box3().setFromObject(horseModel.userData.muzzle);
  assert.ok(muzzle.min.y>=.40&&muzzle.min.y<.90,'focinho deve alcançar o capim sem atravessar o chão');
  for(const age of [.5,1.5,4]){
    horse.age=age;
    for(const graze of [0,.25,.5,.75,1]){
      horse.pose={walk:1-graze,graze,rest:0,care:0};frame(now+=40);
      assert.ok(new Three.Box3().setFromObject(horseModel.userData.muzzle).min.y>=.40,
        'adultos e potros preservam o focinho acima do terreno durante a transição');
      for(const hoof of horseModel.userData.hooves)
        assert.ok(new Three.Box3().setFromObject(hoof).min.y>=.418,
          'cascos de adultos e potros não atravessam o terreno');
    }
  }
  horse.age=4;horse.motion='idle';horse.interacting=true;horse.careKind='alimentacao';
  horse.pose={walk:0,graze:0,care:1,rest:0};horse.x=0;horse.y=0;horse.heading=0;
  worker.x=3.45;worker.y=-1.1;worker.visualHeading=Math.atan2(1.1,-3.45);
  frame(now+=40);
  const feedingMuzzle=new Three.Box3().setFromObject(horseModel.userData.muzzle);
  assert.ok(feedingMuzzle.min.y>1.3&&feedingMuzzle.max.y<3.0,
    'alimentação deve baixar o focinho à altura do atendimento');
  const hatColor=new Three.Color(motion.workerLook(worker).hat),hatBounds=new Three.Box3();
  workerModel.userData.upper.traverse(o=>{
    if(!o.isMesh)return;const color=o.geometry.getAttribute('color'),pos=o.geometry.getAttribute('position');
    if(!color)return;
    for(let i=0;i<color.count;i++)if(Math.abs(color.getX(i)-hatColor.r)+Math.abs(color.getY(i)-hatColor.g)+Math.abs(color.getZ(i)-hatColor.b)<1e-5)
      hatBounds.expandByPoint(new Three.Vector3().fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld));
  });
  assert.ok(!hatBounds.isEmpty(),'chapéu presente na geometria fundida');
  assert.ok(!feedingMuzzle.intersectsBox(hatBounds),'o focinho não deve atravessar o chapéu na alimentação');
  const shadow=horseModel.children.find(m=>m.material?.transparent);
  assert.ok(shadow.getWorldPosition(new Three.Vector3()).y>.40,'sombra deve ficar acima do piquete');
  worker.motion='work';
  for(let i=0;i<90;i++){motion.blend(worker,1/60);frame(now+=40)}
  assert.ok(workerModel.userData.elbows[1].rotation.z>.6,'mão deve levantar o instrumento ao trabalhar');
  assert.ok(workerModel.userData.upper.rotation.z<-.10,'agricultor deve inclinar o tronco no trabalho');
  const pen={o:owner,type:'paddock',x:30,y:0,w:24,h:20,status:'complete',tier:1};
  state.buildings.push(pen);frame(now+=40);
  const findPen=()=>{let found;scene.traverse(o=>{if(o.userData.building===pen)found=o});return found};
  const empty=findPen(),vertices=g=>{let n=0;g.traverse(o=>{if(o.isMesh)n+=o.geometry.getAttribute('position').count});return n};
  const before=vertices(empty);
  routine.record(pen,{role:'tratador',kind:'alimentacao',horseId:1,day:state.day});
  routine.record(pen,{role:'agricultor',day:state.day});frame(now+=40);
  const active=findPen();
  assert.notEqual(active,empty,'serviço deve atualizar o modelo da instalação');
  assert.ok(vertices(active)>before,'cocho e fardo precisam existir em geometria real');
  frame(now+=40);
  assert.equal(findPen(),active,'o mesmo estado reaproveita a geometria');
  state.day+=61;frame(now+=40);
  assert.equal(vertices(findPen()),before,'marcas antigas deixam a geometria');
  console.log('PASS geometria Three.js real',JSON.stringify({
    houseMeshes:houseModel.children.length,hoofFloor:+lowest.toFixed(3),
    muzzleHeight:+muzzle.min.y.toFixed(3),webgl:false
  }));
}finally{
  for(const [key,value] of previous)if(value===undefined)delete globalThis[key];else globalThis[key]=value;
}
