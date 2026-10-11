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
const baselineRef=process.env.FAZENDA_BASELINE_REF||'221af4fbd7890e544cd04f1c61a4889316ccac31';
for(const file of ['index.html','world3d.js','motion.js'])
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
  await basePage.locator('#guideSkip').click();
  await basePage.locator('#pause').click();
  const before=await measurements(basePage);
  await basePage.screenshot({path:resolve(output,'baseline-0.9.9-portrait.png')});
  results.push({version:'0.9.9',viewport:'390x844',...before});
  console.log('BASELINE',JSON.stringify(results.at(-1)));
  // Prancha de revisão visual: os construtores de produção, sem cenário encobrindo.
  async function characterSheet(page,name,dir){
    const source=readFileSync(resolve(dir,'world3d.js'),'utf8');
    await page.evaluate(async ({source,moduleUrl})=>{
      const Three=await import(moduleUrl);
      const start=source.indexOf('/* Fazenda Viva'),end=source.indexOf('function makeTrees');
      const models=new Function('THREE',source.slice(start,end)+';return {makeHorse,makeWorker};')(Three);
      const canvas=document.createElement('canvas');
      canvas.style='position:fixed;inset:0;z-index:99999;width:100vw;height:100vh';
      document.body.append(canvas);
      const r=new Three.WebGLRenderer({canvas,antialias:true});r.setSize(innerWidth,innerHeight);r.setPixelRatio(1.5);
      r.setScissorTest(true);
      const labels=['Cavalo · perfil','Cavalo · frente','Cavalo · pasto','Tratador','Agricultor','Administrador'];
      for(let i=0;i<6;i++){
        const width=innerWidth/3,height=innerHeight/2,x=(i%3)*width,y=i<3?height:0;
        r.setViewport(x,y,width,height);r.setScissor(x,y,width,height);
        const scene=new Three.Scene();scene.background=new Three.Color('#e4ddcc');
        scene.add(new Three.HemisphereLight(0xfff0d9,0x777e65,2));
        const light=new Three.DirectionalLight(0xffffff,1.9);light.position.set(-5,9,6);scene.add(light);
        const horse={id:1,coat:'#9a6545',age:4,motion:i===2?'graze':'idle',phase:0,gait:0,
          pose:{walk:0,graze:i===2?1:0,care:0}};
        const roles=['tratador','agricultor','administrador'];
        const model=i<3?models.makeHorse(horse):models.makeWorker({id:i,role:roles[i-3],color:['#658481','#ad8c57','#718267'][i-3]});
        const entity=i<3?horse:{role:roles[i-3],motion:'idle',gait:0,animTime:0};
        const pose=i<3?window.FazendaVivaMotion.horse(entity):window.FazendaVivaMotion.worker(entity);
        model.userData.legs.forEach((leg,j)=>{leg.position.y=pose.legRoot||leg.position.y;leg.rotation.z=pose.legs[j].hip;
          model.userData.knees[j].rotation.z=pose.legs[j].knee;
          (model.userData.hooves||model.userData.boots)[j].rotation.z=-(pose.legs[j].hip+pose.legs[j].knee)});
        if(i<3){model.userData.neck.rotation.z=pose.neck;
          model.userData.neck.position.y=2.58-pose.neckDrop;model.userData.head.rotation.z=pose.head;model.userData.tail.rotation.z=pose.tail}
        else{model.userData.arms.forEach((arm,j)=>{arm.rotation.z=pose.arms[j];
          if(model.userData.elbows)model.userData.elbows[j].rotation.z=pose.elbows[j]})}
        scene.add(model);
        const camera=new Three.OrthographicCamera(-3.7,3.7,3.7*height/width,-3.7*height/width,.1,100);
        camera.position.set(i===0?0:i===1?12:8,5,i===0?12:i===1?0:12);camera.lookAt(0,1.9,0);
        r.render(scene,camera);
        const label=document.createElement('div');label.textContent=labels[i];
        label.style=`position:fixed;z-index:100000;left:${x+12}px;top:${(i<3?0:height)+14}px;color:#394538;font:600 15px system-ui`;
        document.body.append(label);
      }
    },{source,moduleUrl:url+'/node_modules/three/build/three.module.js'});
    await page.screenshot({path:resolve(output,name)});
  }
  await basePage.setViewportSize({width:1050,height:720});
  await characterSheet(basePage,'baseline-0.9.9-personagens.png',baseline);
  await baseContext.close();

  for(const [width,height] of [[390,844],[320,568],[360,640],[844,390],[1365,900]]){
    const {context,page}=await open(width,height);
    await page.waitForTimeout(350);
    const day=await page.evaluate(()=>window.FazendaVivaBridge.state().day);
    assert.equal(day,1,'guia deve pausar a simulação no dia 1');
    await page.screenshot({path:resolve(output,`0.9.9.1-guide-${width}x${height}.png`)});
    await page.locator('#guideSkip').click();
    await page.locator('#pause').click();
    const after=await measurements(page);
    console.log('RENDER',width+'x'+height,JSON.stringify(after));
    assert.ok(after.calls<300,'orçamento inicial: menos de 300 chamadas na visão local');
    if(width===390)assert.ok(after.calls<=before.calls*1.10,'nova anatomia deve preservar o orçamento de chamadas da 0.9.9');
    await page.screenshot({path:resolve(output,`0.9.9.1-world-${width}x${height}.png`)});
    assert.ok(await page.locator('#hud .brand').evaluate(el=>el.scrollWidth<=el.clientWidth),
      'a versão inteira deve caber no HUD');
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
    await page.screenshot({path:resolve(output,`0.9.9.1-management-${width}x${height}.png`)});
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
      await page.waitForTimeout(1200);
      await page.screenshot({path:resolve(output,'0.9.9.1-horse-close-3d.png')});
      await page.locator('#renderMode').click();
      await page.waitForFunction(()=>{
        const s=window.FazendaVivaBridge.state(),h=s.horses.find(h=>h.id===s.followTarget.id);
        const c=document.getElementById('game'),ctx=c.getContext('2d');
        const scale=Math.min(innerWidth/300,innerHeight/260)*s.zoom;
        const size=c.width/innerWidth;
        const rgb=ctx.getImageData(Math.floor(c.width/2),Math.floor(c.height/2-scale*1.9*size),1,1).data;
        const coat=parseInt(h.coat.slice(1),16);
        return Math.hypot(rgb[0]-(coat>>16&255),rgb[1]-(coat>>8&255),rgb[2]-(coat&255))<75;
      },null,{timeout:5000});
      await page.screenshot({path:resolve(output,'0.9.9.1-horse-close-2d.png')});
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
    await page.screenshot({path:resolve(output,`0.9.9.1-2d-${width}x${height}.png`)});
    await page.locator('#renderMode').click();
    assert.equal(await page.locator('#error').isVisible(),false);
    if(width===390){
      await page.locator('#manageQuick').click();await page.locator('#tab-mercado').click();
      assert.ok((await page.locator('#manageBody').innerText()).includes('As quatro bancas'));
      await page.locator('[data-mgaction="visitFair"]').click();
      await page.screenshot({path:resolve(output,'0.9.9.1-centro-rural-3d.png')});
      await page.mouse.click(width/2,height/2);
      assert.equal(await page.locator('#management').isVisible(),true,'toque no Centro Rural abre o mercado');
      assert.equal(await page.locator('#tab-mercado').getAttribute('aria-selected'),'true');
      await page.locator('#manageClose').click();
      await page.locator('#renderMode').click();
      await page.screenshot({path:resolve(output,'0.9.9.1-centro-rural-2d.png')});
      await page.mouse.click(width/2,height/2);
      assert.equal(await page.locator('#management').isVisible(),true,'Centro Rural também funciona em Canvas');
      await page.locator('#manageClose').click();await page.locator('#renderMode').click();
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
      await page.screenshot({path:resolve(output,'0.9.9.1-regional-3d.png')});
      assert.equal(await page.evaluate(()=>window.FazendaVivaBridge.state().owners.length),5);
      await page.locator('#focus').click();
      await page.locator('#toggle').click();
      await page.locator('#viewWorkers').click();
      await page.locator('#pause').click();
      for(let i=0;i<4;i++)await page.locator('#zoomIn').click();
      await page.waitForTimeout(1200);
      await page.screenshot({path:resolve(output,'0.9.9.1-worker-close-3d.png')});
      await page.locator('#renderMode').click();
      await page.screenshot({path:resolve(output,'0.9.9.1-worker-close-2d.png')});
      await page.locator('#renderMode').click();
    }
    results.push({version:'0.9.9.1',viewport:width+'x'+height,...after});
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
  await page.waitForFunction(()=>{
    const s=window.FazendaVivaBridge.state();
    return s.horses.some(h=>h.o===s.owners[0]&&h.excursions>0);
  },null,{timeout:30000});
  await page.waitForFunction(()=>{
    const s=window.FazendaVivaBridge.state();
    return s.horses.some(h=>h.o===s.owners[0]&&h.pastureStage==='campo'&&h.motion==='graze'&&h.pose?.graze>.9&&Math.hypot(h.x-h.homePoint.x,h.y-h.homePoint.y)>30);
  },null,{timeout:30000});
  await page.locator('#manageQuick').click();await page.locator('#tab-cavalos').click();
  await page.locator('[data-mgaction="watchPasture"]').click();
  assert.equal(await page.evaluate(()=>window.FazendaVivaBridge.state().followTarget.kind),'horse');
  await page.locator('#pause').click();
  await page.waitForTimeout(1200); // Enquadramento 3D converge também no renderer por software.
  assert.ok(await page.evaluate(()=>window.FazendaVivaBridge.state().careMean[0]>50),
    'sessão de pastoreio deve manter manejo funcional');
  await page.screenshot({path:resolve(output,'0.9.9.1-pastoreio-3d.png')});
  await page.locator('#renderMode').click();
  await page.screenshot({path:resolve(output,'0.9.9.1-pastoreio-2d.png')});
  await page.locator('#renderMode').click();
  await page.screenshot({path:resolve(output,'0.9.9.1-restored-webgl.png')});
  await context.close();
  const sheet=await open(1050,720);
  await characterSheet(sheet.page,'0.9.9.1-personagens.png',root);
  await sheet.context.close();
  assert.deepEqual(errors,[],'nenhum erro JavaScript real');
  writeFileSync(resolve(output,'browser-results.json'),JSON.stringify({
    renderer:'Chromium + WebGL2 / SwiftShader (software)',
    realAndroid:false,baselineRef,results,errors,contextRecovery:true,dayAfterRecovery:advanced
  },null,2));
  console.log('PASS Chromium/WebGL real',JSON.stringify(results));
}finally{
  await browser.close();await new Promise(resolve=>server.close(resolve));
}
