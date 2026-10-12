import assert from 'node:assert/strict';
import {gameHarness} from './game-harness.mjs';
// Chegada física: distância da ponta da rota deve permitir o atendimento real.
{
 const game=gameHarness();try{
  const s=game.state(),h=s.horses.find(h=>h.o===s.owners[0]),f=s.farmers.find(f=>f.o===h.o&&f.role==='tratador');
  const meeting=game.helpers.careMeeting(h,'alimentacao');assert.ok(meeting);
  const colleague=s.farmers.find(other=>other.o===f.o&&other!==f);
  const saved={x:colleague.x,y:colleague.y};Object.assign(colleague,meeting.worker);
  const alternative=game.helpers.careMeeting(h,'alimentacao',f.id);
  assert.ok(alternative&&Math.hypot(alternative.worker.x-colleague.x,alternative.worker.y-colleague.y)>2.7,
    'encontro deve escolher outro lugar quando um colega ocupa o ponto');
  Object.assign(colleague,saved);
  Object.assign(h,meeting.horse,{pastureStage:'manejo',pastureRoute:[],heading:0});
  Object.assign(f,{x:meeting.worker.x+.60,y:meeting.worker.y,route:[meeting.worker],routeIndex:0,
   wait:0,working:false,targetHorseId:h.id,meetingPoint:meeting.horse,serviceKind:'alimentacao',targetBuilding:h.homePaddock});
  assert.ok(game.helpers.workerSafe(f.o,f.x,f.y,2));
  for(let i=0;i<8;i++)game.helpers.animateFarmers(.05);
  assert.equal(f.working,true,'tratador deve chegar ao ponto antes de esperar pelo animal');
  assert.ok(Math.hypot(f.x-h.x,f.y-h.y)<3.8,'posição final permite manejo presencial');
  console.log('PASS chegada ao ponto de trato');
 }finally{game.restore()}
}
{
 const game=gameHarness();try{
  const s=game.state(),hs=s.horses.filter(h=>h.o===s.owners[1]),[waiting,moving]=hs;
  Object.assign(waiting,{x:305,y:-262.33185464312817,pastureStage:'manejo',pastureRoute:[]});
  Object.assign(moving,{x:308.43090021845825,y:-266.8869185711163,pastureStage:'campo',pastureRoute:[{x:295,y:-265}],pastureIndex:0});
  const before=Math.hypot(moving.x-waiting.x,moving.y-waiting.y),x=moving.x;
  for(let i=0;i<1;i++){
   const p={x:moving.x,y:moving.y};game.helpers.movePastureHorse(moving,1/30);
   assert.ok(Math.hypot(moving.x-p.x,moving.y-p.y)<.10,'desvio não teletransporta');
  }
  assert.ok(moving.x>x&&Math.hypot(moving.x-waiting.x,moving.y-waiting.y)>before,
    'primeiro desvio deve aumentar a separação sem atravessar a casa ou o outro cavalo');
  console.log('PASS abertura de passagem em corredor estreito');
 }finally{game.restore()}
}
const profiles=[
 {name:'60 FPS',steps:[1000/60],speed:8},
 {name:'quadros variáveis',steps:[8,16,33,21,50,12],speed:8},
 {name:'30 FPS',steps:[1000/30],speed:3},
 {name:'quadros variáveis',steps:[8,16,33,21,50,12],speed:1}
];
for(const profile of profiles){
 const game=gameHarness();try{
  const s=game.state(),o=s.owners[0];
  if(profile.speed>=3)game.ui.get('speed').onclick();if(profile.speed===8)game.ui.get('speed').onclick();
  let min=100,frames=0,maxWait=0;
  while(game.state().day<866){
   game.advance(profile.steps[frames++%profile.steps.length]);
   const live=game.state();min=Math.min(min,...live.horses.filter(h=>h.o===o).map(h=>h.care));
   maxWait=Math.max(maxWait,...live.farmers.filter(f=>f.o===o&&f.role==='tratador').map(f=>f.patientWait||0));
   assert.ok(frames<80000,'calendário deve avançar');
  }
  const live=game.state();
  console.log('CARE',JSON.stringify({profile:profile.name,speed:profile.speed,day:live.day,minCare:+min.toFixed(2),maxWait:+maxWait.toFixed(2),
   services:live.horses.filter(h=>h.o===o).map(h=>h.careServices||0)}));
  assert.ok(min>50,'manejo contínuo em '+profile.name+' / '+profile.speed+'×: '+min);
  assert.ok(live.horses.filter(h=>h.o===o).every(h=>h.careServices>=3),'plantel inicial inteiro atendido');
  assert.ok(live.careJournal.every(j=>j.distance<3.8),'cuidado exige proximidade física');
 }finally{game.restore()}
}
