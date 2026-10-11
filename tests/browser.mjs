// Navegador real + WebGL/SwiftShader. Não representa um Android físico.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const output=resolve(root,'qa-artifacts');mkdirSync(output,{recursive:true});
const baseline=resolve(output,'baseline');mkdirSync(baseline,{recursive:true});
const baselineRef=process.env.FAZENDA_BASELINE_REF||'8f28cad65071b063487ce18934d75817ad990e51';
for(const file of ['index.html','world3d.js'])
  writeFileSync(resolve(baseline,file),execFileSync('git',['show',baselineRef+':'+file],{cwd:root}));
const server=createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const dir=pathname.startsWith('/baseline/')?baseline:root;
  const name=pathname.startsWith('/baseline/')?pathname.slice(10):pathname.slice(1);
  const file=resolve(dir,name||'index.html');
  if(!file.startsWith(dir+'/')){res.writeHead(403);res.end();return}
  try{
    res.writeHead(200,{'Content-Type':extname(file)==='.js'?'text/javascript':'text/html','Cache-Control':'no-store'});
    res.end(readFileSync(file));
  }catch{res.writeHead(404);res.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({
  ...(process.env.FAZENDA_BROWSER_EXECUTABLE?{executablePath:process.env.FAZENDA_BROWSER_EXECUTABLE}:{}),
  headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']
}).catch(error=>{server.close();throw error});
const results=[];
const errors=[];
async function open(width,height,route='/'){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,
    isMobile:width<900,hasTouch:width<900});
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push({width,height,message:error.message}));
  // Mesma versão do CDN, servida localmente para isolar a disponibilidade da rede.
  // É a biblioteca oficial completa: não é um mock do Three.js ou de WebGL.
  await page.route(/https:\/\/(cdn\.jsdelivr\.net|unpkg\.com)\/.*three.*three\.module\.js/,
    request=>request.fulfill({path:resolve(root,'node_modules/three/build/three.module.js'),
      contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'}}));
  await page.goto(url+route);
  try{
    await page.waitForFunction(()=>window.FazendaViva3DReady&&
      document.getElementById('renderMode').textContent.includes('2D'),null,{timeout:20000});
  }catch(error){
    await page.screenshot({path:resolve(output,`failed-start-${width}x${height}.png`)});
    writeFileSync(resolve(output,'failed-start.json'),JSON.stringify({
      url:page.url(),text:await page.locator('body').innerText(),errors
    },null,2));
    throw error;
  }
  await page.evaluate(()=>{
    const bridge=window.FazendaVivaBridge,original=bridge.reportPerformance;
    window.__qaSamples=[];
    bridge.reportPerformance=snapshot=>{window.__qaSamples.push(snapshot);original(snapshot)};
  });
  return {context,page};
}
async function measurements(page){
  await page.waitForFunction(()=>window.__qaSamples.filter(s=>s.mode==='3D'&&s.calls>0).length>=4,null,{timeout:20000});
  return page.evaluate(()=>{
    // Descartar a primeira leitura: o loop acaba de iniciar e ainda está aquecendo.
    const samples=window.__qaSamples.filter(s=>s.mode==='3D'&&s.calls>0).slice(1);
    return {samples:samples.length,calls:Math.max(...samples.map(s=>s.calls)),
      triangles:Math.max(...samples.map(s=>s.triangles)),
      fpsMean:samples.reduce((n,s)=>n+s.fps,0)/samples.length,
      dpr:samples.at(-1).dpr};
  });
}
try{
  const {context:baseContext,page:basePage}=await open(390,844,'/baseline/index.html');
  await basePage.locator('#pause').click();
  const before=await measurements(basePage);
  await basePage.screenshot({path:resolve(output,'0.9.7-portrait.png')});
  results.push({version:'0.9.7',viewport:'390x844',...before});
  console.log('BASELINE',JSON.stringify(results.at(-1)));
  await baseContext.close();

  for(const [width,height] of [[390,844],[320,568],[360,640],[844,390],[1365,900]]){
    const {context,page}=await open(width,height);
    await page.waitForTimeout(350);
    const day=await page.evaluate(()=>window.FazendaVivaBridge.state().day);
    assert.equal(day,1,'guia deve pausar a simulação no dia 1');
    await page.screenshot({path:resolve(output,`0.9.8-guide-${width}x${height}.png`)});
    await page.locator('#guideSkip').click();
    await page.locator('#pause').click();
    const after=await measurements(page);
    assert.ok(after.calls<300,'orçamento inicial: menos de 300 chamadas na visão local');
    if(width===390)assert.ok(after.calls<before.calls*.8,'redução real de chamadas com geometria estática fundida');
    console.log('RENDER',width+'x'+height,JSON.stringify(after));
    await page.screenshot({path:resolve(output,`0.9.8-world-${width}x${height}.png`)});
    const bounds=await page.evaluate(()=>{
      const ids=['hud','economy','topTools','bottom','zoomTools'];
      return ids.map(id=>{
        const r=document.getElementById(id).getBoundingClientRect();
        return {id,x:r.x,y:r.y,right:r.right,bottom:r.bottom};
      });
    });
    for(const b of bounds)assert.ok(b.x>=0&&b.y>=0&&b.right<=width+.5&&b.bottom<=height+.5,
      'controle fora da viewport: '+b.id+' '+width+'x'+height);
    const tools=await page.locator('#topTools').boundingBox();
    const hud=await page.locator('#hud').boundingBox();
    assert.ok(tools.y>=hud.y+hud.height||tools.x>=hud.x+hud.width,'HUD e controles não podem sobrepor-se');
    await page.locator('#toggle').click();
    await page.locator('#actions button[data-type="barn"]').click();
    assert.equal(await page.locator('#sceneContext').isVisible(),true,'modo de construção fica explícito');
    await page.locator('#contextCancel').click();
    assert.equal(await page.locator('#sceneContext').isVisible(),false,'construção pode ser cancelada');
    await page.locator('#manageQuick').click();
    const freeze=await page.evaluate(()=>window.FazendaVivaBridge.state().day);
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(()=>window.FazendaVivaBridge.state().day),freeze);
    for(const section of ['resumo','financas','cavalos','equipe','mercado','metas']){
      await page.locator('#tab-'+section).click();
      assert.ok((await page.locator('#manageBody').innerText()).length>60);
      const fits=await page.locator('#manageBody').evaluate(el=>el.scrollWidth<=el.clientWidth+1);
      assert.ok(fits,'conteúdo da gestão transborda horizontalmente: '+section);
    }
    await page.locator('#tab-cavalos').click();
    await page.screenshot({path:resolve(output,`0.9.8-management-${width}x${height}.png`)});
    await page.locator('[data-mgaction="findHorse"]').first().click();
    assert.equal(await page.evaluate(()=>window.FazendaVivaBridge.state().followTarget.kind),'horse');
    await page.locator('#pause').click();
    await page.waitForTimeout(350);
    const followError=await page.evaluate(()=>{
      const s=window.FazendaVivaBridge.state(),h=s.horses.find(h=>h.id===s.followTarget.id);
      return Math.hypot(s.panX-h.x,s.panY-h.y);
    });
    assert.ok(followError<.001,'câmera deve acompanhar a posição real do animal');
    await page.waitForFunction(()=>Number(getComputedStyle(document.getElementById('status')).opacity)<.01);
    if(width===390){
      await page.locator('#pause').click();
      for(let i=0;i<4;i++)await page.locator('#zoomIn').click();
      await page.screenshot({path:resolve(output,'0.9.8-horse-close-3d.png')});
      await page.locator('#renderMode').click();
      await page.waitForFunction(()=>{
        const s=window.FazendaVivaBridge.state(),h=s.horses.find(h=>h.id===s.followTarget.id);
        const c=document.getElementById('game'),ctx=c.getContext('2d');
        const rgb=ctx.getImageData(Math.floor(c.width/2),Math.floor(c.height/2),1,1).data;
        const coat=parseInt(h.coat.slice(1),16);
        return rgb[0]===(coat>>16&255)&&rgb[1]===(coat>>8&255)&&rgb[2]===(coat&255);
      },null,{timeout:5000});
      await page.screenshot({path:resolve(output,'0.9.8-horse-close-2d.png')});
      await page.locator('#renderMode').click();
      await page.locator('#pause').click();
    }
    await page.mouse.move(width*.45,height*.55);
    await page.mouse.down();await page.mouse.move(width*.45+28,height*.55,{steps:4});await page.mouse.up();
    assert.equal(await page.evaluate(()=>window.FazendaVivaBridge.state().followTarget),null,'arrasto encerra acompanhamento');
    await page.locator('#focus').click();
    if(width===390){
      const cdp=await context.newCDPSession(page);
      const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{
        type,touchPoints:points.map(([x,y,id])=>({x,y,id,radiusX:4,radiusY:4,force:1}))
      });
      const startZoom=await page.evaluate(()=>window.FazendaVivaBridge.state().zoom);
      await touch('touchStart',[[150,440,1],[230,440,2]]);
      await touch('touchMove',[[130,440,1],[250,440,2]]);
      await touch('touchMove',[[110,440,1],[270,440,2]]);
      await touch('touchCancel',[]);
      const pinched=await page.evaluate(()=>window.FazendaVivaBridge.state().zoom);
      assert.ok(pinched>startZoom,'pinça real deve aproximar a câmera');
      const startPan=await page.evaluate(()=>window.FazendaVivaBridge.state().panX);
      await touch('touchStart',[[180,440,3]]);
      await touch('touchMove',[[210,440,3]]);
      await touch('touchEnd',[]);
      assert.notEqual(await page.evaluate(()=>window.FazendaVivaBridge.state().panX),startPan,
        'arrasto deve funcionar após cancelamento de gesto');
      await cdp.detach();
      await page.locator('#focus').click();
      await page.locator('#toggle').click();
      await page.locator('#panel summary').click();
      await page.locator('#graphicsMode').click();
      assert.equal(await page.evaluate(()=>window.FazendaVivaBridge.state().lowGraphics),true);
      await page.locator('#graphicsMode').click();
      assert.equal(await page.evaluate(()=>window.FazendaVivaBridge.state().lowGraphics),false);
      await page.locator('#panelClose').click();
    }
    for(let i=0;i<3;i++){
      await page.locator('#renderMode').click();
      assert.ok((await page.locator('#renderMode').innerText()).includes('3D'));
      await page.locator('#renderMode').click();
      assert.ok((await page.locator('#renderMode').innerText()).includes('2D'));
    }
    await page.locator('#renderMode').click();
    await page.screenshot({path:resolve(output,`0.9.8-2d-${width}x${height}.png`)});
    await page.locator('#renderMode').click();
    assert.equal(await page.locator('#error').isVisible(),false);
    if(width===390){
      await page.locator('#map').click();
      await page.waitForFunction(()=>[...document.querySelectorAll('#sceneLabels > div')].slice(0,5)
        .every(el=>el.style.display==='block'));
      const labelsClear=await page.evaluate(()=>{
        const z=document.getElementById('zoomTools').getBoundingClientRect();
        return [...document.querySelectorAll('#sceneLabels > div')].slice(0,5).every(el=>{
          const r=el.getBoundingClientRect();
          return r.left>=0&&r.right<=innerWidth&&
            (r.right<=z.left||r.left>=z.right||r.bottom<=z.top||r.top>=z.bottom);
        });
      });
      assert.ok(labelsClear,'nomes das fazendas não podem cobrir controles de zoom');
      await page.screenshot({path:resolve(output,'0.9.8-regional-3d.png')});
      assert.equal(await page.evaluate(()=>window.FazendaVivaBridge.state().owners.length),5);
      await page.locator('#focus').click();
      await page.locator('#toggle').click();
      await page.locator('#viewWorkers').click();
      await page.locator('#pause').click();
      for(let i=0;i<4;i++)await page.locator('#zoomIn').click();
      await page.screenshot({path:resolve(output,'0.9.8-worker-close-3d.png')});
      await page.locator('#renderMode').click();
      await page.screenshot({path:resolve(output,'0.9.8-worker-close-2d.png')});
      await page.locator('#renderMode').click();
    }
    results.push({version:'0.9.8',viewport:width+'x'+height,...after});
    await context.close();
  }
  // Perda/restauração de contexto real, viewport e simulação funcionando juntas.
  const {context,page}=await open(390,844);
  await page.locator('#guideSkip').click();
  await page.evaluate(()=>{
    const canvas=[...document.querySelectorAll('canvas')].find(c=>c.id!=='game');
    const gl=canvas.getContext('webgl2');
    const extension=gl.getExtension('WEBGL_lose_context');
    if(!extension)throw Error('WEBGL_lose_context indisponível');
    extension.loseContext();
    setTimeout(()=>extension.restoreContext(),600);
  });
  await page.waitForFunction(()=>document.getElementById('renderMode').textContent.includes('3D'),null,{timeout:15000});
  await page.waitForFunction(()=>document.getElementById('renderMode').textContent.includes('2D'),null,{timeout:15000});
  await page.waitForTimeout(800);
  assert.equal(await page.locator('#error').isVisible(),false);
  await page.locator('#speed').click();await page.locator('#speed').click();
  await page.waitForTimeout(10000);
  const advanced=await page.evaluate(()=>window.FazendaVivaBridge.state().day);
  assert.ok(advanced>10,'economia deve continuar após alternar modos/restaurar WebGL');
  await page.locator('#pause').click();
  await page.screenshot({path:resolve(output,'0.9.8-restored-webgl.png')});
  await context.close();
  assert.deepEqual(errors,[],'nenhum erro JavaScript real');
  writeFileSync(resolve(output,'browser-results.json'),JSON.stringify({
    renderer:'Chromium + WebGL2 / SwiftShader (software)',
    realAndroid:false,baselineRef,results,errors,contextRecovery:true,dayAfterRecovery:advanced
  },null,2));
  console.log('PASS Chromium/WebGL real',JSON.stringify(results));
}finally{
  await browser.close();await new Promise(resolve=>server.close(resolve));
}
