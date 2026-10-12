/* Marcas do trabalho real em cada instalação. Sem dinheiro, estoque ou RNG novos. */
(()=>{
 'use strict';
 const count=(event,day,life)=>event?Math.max(0,Math.ceil(event.units*(1-Math.max(0,day-event.day)/life))):0;
 function record(b,{role,kind,day,horseId}){
  if(!b||b.status==='building')return null;
  const r=b.routine||(b.routine={});let label;
  if(role==='tratador'&&kind==='alimentacao'&&horseId!=null){
   r.feeding={day,units:4};label='Trato realizado';
  }else if(role==='tratador'&&kind==='limpeza'){
   r.cleaning={day,units:1};label='Cocho e instalação limpos';
  }else if(role==='tratador'&&kind==='escovacao'&&horseId!=null){
   label='Escovação concluída';
  }else if(role==='agricultor'&&['barn','paddock'].includes(b.type)){
   r.production={day,units:Math.min(4,count(r.production,day,60)+1)};
   label=b.type==='barn'?'Fardos organizados no galpão':'Feno organizado no piquete';
  }else if(role==='administrador')label='Rotina da cabanha conferida';
  else return null;
  r.last={day,role,label};return r.last;
 }
 function state(b,day){
  const r=b.routine||{};
  return {feed:count(r.feeding,day,35),clean:count(r.cleaning,day,45),
   bundles:count(r.production,day,60),last:r.last||null};
 }
 function props(b,day){
  const s=state(b,day),out=[],w=b.w,d=b.h;
  const add=(kind,x,y,z,width,height,depth,color)=>out.push({kind,x,y,z,w:width,h:height,d:depth,color});
  if(b.type==='paddock'){
   if(s.clean)add('bedding',-w*.32,.41,d*.30,4.4,.035,2.2,0xb3ae79);
   if(s.feed)add('feed',-w*.34,1.06+s.feed*.025,d*.32,1.80,.07+s.feed*.05,.65,0xa2a15b);
   for(let i=0;i<s.bundles;i++){
    const x=-w*.34+(i%2)*1.28,z=d*.10-Math.floor(i/2)*1.15;
    add('bundle',x,.77,z,1.05,.68,.85,0xc4ad69);
    add('binding',x,1.12,z,.16,.05,.91,0x806042);
   }
  }else if(b.type==='barn'){
   const front=(d-.55)*.44;
   for(let i=0;i<s.bundles;i++){
    const x=-w*.25+(i%2)*1.15,y=.55+Math.floor(i/2)*.66;
    add('bundle',x,y,front+.82,1.03,.60,.78,0xc4ad69);
    add('binding',x,y+.32,front+.82,.16,.04,.84,0x806042);
   }
  }else if(b.type==='stable'&&s.clean){
   add('bedding',0,.41,(d-.55)*.44+1.1,w*.40,.035,1.6,0xb3ae79);
  }
  return out;
 }
 const api={record,state,props,signature:(b,day)=>{const s=state(b,day);return [s.feed,s.clean,s.bundles].join(':')}};
 if(typeof module!=='undefined')module.exports=api;
 if(typeof window!=='undefined')window.FazendaVivaRoutine=api;
})();
