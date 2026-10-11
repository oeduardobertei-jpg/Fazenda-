// Teste de regressão 3D sem WebGL real ou conexão de internet.
// node tests/render3d.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const world=readFileSync(new URL('../world3d.js',import.meta.url),'utf8');
const source=world.slice(world.indexOf('/* Fazenda Viva'));
assert.ok(source.startsWith('/* Fazenda Viva'));
const meshes=[];
let renders=0,frame,modelsCreated=0;
class Mock3D{
  constructor(...args){
    modelsCreated++;
    this.args=args;this.geometry=args[0];this.material=args[1];
    this.children=[];this.userData={};this.style={};this.visible=true;
    this.domElement={style:{},addEventListener(){}};
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
  setPixelRatio(){}
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
  [id,{style:{},textContent:'',addEventListener(){}}]));
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
  fairground:{x:-65,y:212},ruralEvent:null,panX:-315,panY:-280,zoom:3,
  lowGraphics:false
};
const previous=new Map();
const mocks={
  window:{FazendaVivaBridge:{state:()=>state,mode(){}},addEventListener(){}},
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
