import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const motion=createRequire(import.meta.url)('../motion.js');

const horse={id:1,phase:4,gait:0,motion:'idle'};
motion.blend(horse,0);
horse.motion='graze';
motion.blend(horse,1/60);
const first=motion.horse(horse);
assert.ok(first.graze>0&&first.graze<.2,'transição para pasto não pode saltar');
for(let i=0;i<80;i++)motion.blend(horse,1/60);
assert.ok(motion.horse(horse).neck<-1.4,'pescoço deve alcançar a pose de pasto');
horse.motion='walk';
const before=motion.horse(horse).neck;
motion.blend(horse,1/60);
assert.ok(Math.abs(motion.horse(horse).neck-before)<.17,'retorno do pasto suave');
for(let i=0;i<80;i++)motion.blend(horse,1/60);

const phases=new Set();
for(let i=0;i<64;i++){
  horse.gait=i*Math.PI/32;
  const pose=motion.horse(horse);
  for(const [j,leg] of pose.legs.entries()){
    assert.ok([leg.hip,leg.knee,leg.x,leg.lift].every(Number.isFinite));
    const sign=j<2?-1:1;
    const down=.73*Math.cos(leg.hip)+.75*Math.cos(leg.hip+leg.knee);
    const horizontal=.73*Math.sin(leg.hip)+.75*Math.sin(leg.hip+leg.knee);
    assert.ok(Math.abs(horizontal-leg.x)<1e-6,'articulações posicionam casco no alvo');
    assert.ok(Math.abs(down-(pose.legRoot-.12-leg.lift))<1e-6,'altura do casco coincide com a passada');
    assert.ok(leg.knee*sign>0,'joelho respeita a articulação anterior/posterior');
    if(leg.lift>.001)phases.add(j);
  }
}
assert.equal(phases.size,4,'os quatro cascos devem executar apoio e balanço');
horse.motion='idle';
for(let i=0;i<100;i++)motion.blend(horse,1/60);
assert.ok(motion.horse(horse).walk<.0001,'repouso encerra a passada');
assert.ok(motion.horse(horse).legs.every(l=>Math.abs(l.knee)<.10),'repouso não deve agachar o cavalo');
const worker={id:1,role:'agricultor',motion:'work',animTime:1,gait:4};
for(let i=0;i<80;i++)motion.blend(worker,1/60);
const task=motion.worker(worker);
assert.ok(task.work>.99&&Math.abs(task.tool)>.01,'trabalho movimenta o equipamento');
assert.ok(task.legs.every(l=>l.lift===0),'trabalho não inventa passos');
console.log('PASS poses compartilhadas: transições, quatro apoios, articulações e trabalho');
