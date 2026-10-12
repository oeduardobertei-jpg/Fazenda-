// Revisão visual focada do terreno; WebGL por software não mede Android físico.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=resolve(fileURLToPath(new URL('..',import.meta.url))),output=resolve(root,'qa-artifacts'),baseline=resolve(output,'baseline');
mkdirSync(baseline,{recursive:true});
const baselineRef='75e8168';
for(const file of ['index.html','world3d.js','motion.js','audio.js','ui.css','terrain.js','routine.js'])writeFileSync(resolve(baseline,file),execFileSync('git',['show',baselineRef+':'+file],{cwd:root}));
const server=createServer((req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname,isBase=path.startsWith('/baseline/'),dir=isBase?baseline:root;
 const file=resolve(dir,(isBase?path.slice(10):path.slice(1))||'index.html');
 if(!file.startsWith(dir+'/')){res.writeHead(403);res.end();return}
 try{res.writeHead(200,{'Content-Type':extname(file)==='.js'?'text/javascript':extname(file)==='.css'?'text/css':'text/html','Cache-Control':'no-store'});res.end(readFileSync(file))}
 catch{res.writeHead(404);res.end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],results=[];
async function capture(width,height,base=false){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<900,hasTouch:width<900}),page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/Shader Error|shader.*compil|VALIDATE_STATUS/i.test(m.text()))errors.push(m.text())});
 await page.route(/https:\/\/(cdn\.jsdelivr\.net|unpkg\.com)\/.*three.*three\.module\.js/,r=>r.fulfill({path:resolve(root,'node_modules/three/build/three.module.js'),contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'}}));
 await page.goto(url+(base?'/baseline/index.html':'/'));
 await page.waitForFunction(()=>window.FazendaViva3DReady&&document.getElementById('renderMode').textContent.includes('2D'));
 await page.locator('#guideSkip').click();await page.locator('#pause').click();
 await page.evaluate(()=>{
  window.__terrainSamples=[];const b=window.FazendaVivaBridge,old=b.reportPerformance;
  b.reportPerformance=s=>{window.__terrainSamples.push(s);old(s)};
 });
 await page.waitForFunction(()=>window.__terrainSamples.some(s=>s.mode==='3D'&&s.calls>0),null,{timeout:20000});
 const data=await page.evaluate(()=>{
  const s=window.FazendaVivaBridge.state(),samples=window.__terrainSamples.filter(s=>s.mode==='3D'&&s.calls>0);
  return {calls:Math.max(...samples.map(s=>s.calls)),triangles:Math.max(...samples.map(s=>s.triangles)),
   sectors:s.owners.map(o=>({owner:o.name,count:s.terrain.areas.filter(a=>a.owner===o&&a.sector).length})),
   day:s.day,buildings:s.buildings.length};
 });
 assert.equal(data.day,1);assert.equal(await page.locator('#error').isVisible(),false);
 if(!base)assert.ok(data.sectors.every(s=>s.count>=6),'todas as fazendas precisam de setores visíveis');
 const label=base?'baseline-0.9.9.13':'0.9.9.14';
 await page.screenshot({path:resolve(output,`${label}-paisagem-3d-${width}x${height}.png`)});
 await page.locator('#renderMode').click();
 await page.screenshot({path:resolve(output,`${label}-paisagem-2d-${width}x${height}.png`)});
 await page.locator('#renderMode').click();
 for(let i=0;i<3;i++)await page.locator('#zoomIn').click();
 await page.screenshot({path:resolve(output,`${label}-paisagem-perto-${width}x${height}.png`)});
 await context.close();return {version:label,viewport:`${width}x${height}`,...data};
}
try{
 const before=await capture(390,844,true);results.push(before);
 for(const [w,h] of [[390,844],[320,568],[360,640],[844,390],[1365,900]])results.push(await capture(w,h));
 console.log('ORÇAMENTO PAISAGEM',JSON.stringify(results));
 assert.ok(results[1].calls<=before.calls*1.10);assert.ok(results[1].triangles<=before.triangles*1.08);
 assert.deepEqual(errors,[]);
 writeFileSync(resolve(output,'terrain-browser-results.json'),JSON.stringify({baselineRef,renderer:'Chromium/WebGL2 SwiftShader',realAndroid:false,results,errors},null,2));
 console.log('PASS paisagem WebGL',JSON.stringify(results));
}finally{await browser.close();await new Promise(r=>server.close(r))}
