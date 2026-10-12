import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const terrain=createRequire(import.meta.url)('../terrain.js');
const owner={name:'Teste',x:0,y:0,style:{ground:0xa6b98a,leaf:0x607e4a,roof:0x98543e}};
const buildings=[{o:owner,x:0,y:0,w:12,h:10,type:'house',status:'complete'},
 {o:owner,x:0,y:23,w:20,h:16,type:'paddock',status:'complete'}];
const trails=[{owner:'Teste',x1:-35,y1:-20,x2:35,y2:-20,w:5}];
const ponds=[{x:60,y:30,rx:12,ry:10}],state={owners:[owner],buildings,trails,ponds};
const a=terrain.generate(state),b=terrain.generate(state);
assert.deepEqual(a,b,'navegação não muda a distribuição do solo');
assert.ok(a.areas.filter(s=>s.layer==='field').length>20,'manchas e acostamentos devem existir');
assert.equal(a.areas.filter(s=>s.layer==='pen').length,3);
const sectors=a.areas.filter(s=>s.sector);
assert.ok(sectors.length>=6,'parcelas de pastagem devem ser legíveis mesmo na fazenda inicial');
assert.ok(sectors.some(s=>s.dry)&&sectors.some(s=>!s.dry),'pastagem e palha têm variação tonal');
for(const s of sectors){
 assert.ok(!buildings.some(b=>Math.abs(s.x-b.x)<s.rx+b.w/2+4&&Math.abs(s.y-b.y)<s.ry+b.h/2+4),
  'setores preservam a margem das instalações');
 assert.ok(!(Math.abs(s.y+20)<s.ry+4.5&&s.x+s.rx+4.5>=-35&&s.x-s.rx-4.5<=35),
  'faixas de pastagem não atravessam o caminho');
 assert.ok(terrain.contour(s).every(p=>Math.hypot(p.x,p.y)<=116),'setores ficam dentro da propriedade');
}
const occupied=sectors[0],extra={o:owner,x:occupied.x,y:occupied.y,w:12,h:10,type:'barn',status:'building'};
assert.ok(!terrain.generate({...state,buildings:[...buildings,extra]}).areas.some(s=>s.sector&&s.x===occupied.x&&s.y===occupied.y),
 'nova obra retira a parcela visual do espaço reservado');
for(const area of a.areas){
 const outline=terrain.contour(area);
 assert.equal(outline.length,area.layer==='sector'?4:16);
 assert.ok(outline.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)),'contornos devem ser finitos');
 if(area.layer==='pen')assert.ok(outline.every(p=>Math.abs(p.x-area.building.x)<area.building.w/2&&Math.abs(p.y-area.building.y)<area.building.h/2),
  'solo gasto deve ficar dentro do piquete');
}
for(const g of a.sprigs.filter(g=>!g.building)){
 assert.ok(!buildings.some(b=>Math.abs(g.x-b.x)<b.w/2+.8&&Math.abs(g.y-b.y)<b.h/2+.8),'plantas baixas não invadem instalações');
 assert.ok(Math.abs(g.y+20)>=trails[0].w/2+.6||g.x<-35||g.x>35,'margens não bloqueiam o centro do caminho');
 assert.ok(((g.x-60)/12)**2+((g.y-30)/10)**2>1,'plantas não aparecem dentro da água');
 assert.ok(g.height<=.4,'vegetação baixa deve preservar a leitura dos animais');
}
const grain=terrain.grain();
assert.equal(grain.length,128*128*4);assert.equal(terrain.grain(),grain);
assert.ok(new Set(grain).size>12,'grão deve possuir variação tonal');
assert.ok(grain.every((v,i)=>i%4===3?v===255:v>=238&&v<=255),'grão deve manter contraste suave');
buildings[1].status='building';
assert.equal(terrain.generate(state).areas.filter(a=>a.layer==='pen').length,0,'canteiro não recebe solo de piquete concluído');
console.log('PASS terreno: distribuição estável, margens, água, piquetes e contraste');
