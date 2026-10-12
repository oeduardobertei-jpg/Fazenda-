import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const routine=createRequire(import.meta.url)('../routine.js');
const pen={type:'paddock',w:20,h:16,status:'complete'},barn={type:'barn',w:16,h:13,status:'complete'},stable={type:'stable',w:17,h:10,status:'complete'};
assert.deepEqual(routine.props(pen,1),[],'sem serviço não há trato nem fardos novos');
routine.record(pen,{role:'tratador',kind:'alimentacao',day:6});
assert.equal(routine.state(pen,6).feed,0,'alimentação exige atendimento de um animal');
routine.record(pen,{role:'tratador',kind:'escovacao',horseId:7,day:6});
assert.equal(routine.state(pen,6).feed,0,'escovação não deve encher o cocho');
routine.record(pen,{role:'tratador',kind:'alimentacao',horseId:7,day:11});
assert.equal(routine.state(pen,11).feed,4);
assert.equal(routine.state(pen,41).feed,1);
assert.equal(routine.state(pen,46).feed,0,'trato visual se reduz com o calendário');
routine.record(pen,{role:'tratador',kind:'limpeza',day:11});
assert.equal(routine.state(pen,51).clean,1);
assert.equal(routine.state(pen,56).clean,0);
for(let i=0;i<12;i++)routine.record(barn,{role:'agricultor',day:21});
assert.equal(routine.state(barn,21).bundles,4,'pilhas limitadas a quatro fardos');
assert.equal(routine.state(pen,21).bundles,0,'serviço do galpão não altera outro prédio');
assert.equal(routine.state(barn,81).bundles,0);
routine.record(stable,{role:'tratador',kind:'limpeza',day:21});
for(const b of [pen,barn,stable])for(const a of routine.props(b,21)){
 assert.ok(Math.abs(a.x)+a.w/2<b.w/2&&Math.abs(a.z)+a.d/2<b.h/2,
  'objetos permanecem dentro da instalação, sem bloquear trilhas');
 assert.ok([a.x,a.y,a.z,a.w,a.h,a.d].every(Number.isFinite));
}
const stamp=routine.signature(barn,21);
routine.record(barn,{role:'administrador',day:21});
assert.equal(routine.signature(barn,21),stamp,'registro administrativo não recria geometria');
const site={type:'barn',w:22,h:18,status:'building'};
assert.equal(routine.record(site,{role:'agricultor',day:1}),null);
assert.equal(site.routine,undefined,'obra ainda não produz marcas de serviço');
console.log('PASS rotina: serviço local, desgaste, limites e área livre');
