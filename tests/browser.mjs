// Navegador real + WebGL/SwiftShader. Não representa um Android físico.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
if(process.env.FAZENDA_BROWSER_FOCUS==='services'){
  await import('./routine-browser.mjs');process.exit(0);
}

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const output=resolve(root,'qa-artifacts');mkdirSync(output,{recursive:true});
const baseline=resolve(output,'baseline');mkdirSync(baseline,{recursive:true});
const baselineRef=process.env.FAZENDA_BASELINE_REF||'db2bda219d41a31081eee9b467163dbe1ce9a185';
for(const file of ['index.html','world3d.js','motion.js','audio.js','ui.css','terrain.js'])
  writeFileSync(resolve(baseline,file),execFileSync('git',['show',baselineRef+':'+file],{cwd:root}));
const server=createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const dir=pathname.startsWith('/baseline/')?baseline:root;
  const name=pathname.startsWith('/baseline/')?pathname.slice(10):pathname.slice(1);
  const file=resolve(dir,name||'index.html');
  if(!file.startsWith(dir+'/')){res.writeHead(403);res.end();return}
  try{
    res.writeHead(200,{'Content-Type':extname(file)==='.js'?'text/javascript':extname(file)==='.css'?'text/css':'text/html','Cache-Control':'no-store'});
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
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:width<900?2:1,
    isMobile:width<900,hasTouch:width<900});
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push({width,height,message:error.message}));
  page.on('console',message=>{if(message.type()==='error'&&/Shader Error|shader.*compil|VALIDATE_STATUS/i.test(message.text()))
    errors.push({width,height,message:message.text()})});
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
  await basePage.screenshot({path:resolve(output,'baseline-0.9.9.11-portrait.png')});
  results.push({version:'0.9.9.11',viewport:'390x844',...before});
  console.log('BASELINE',JSON.stringify(results.at(-1)));
  // Prancha de revisão visual: os construtores de produção, sem cenário encobrindo.
  async function characterSheet(page,name,dir,movement=false,equineOnly=false){
    const source=readFileSync(resolve(dir,'world3d.js'),'utf8');
    await page.evaluate(async ({source,moduleUrl,movement,equineOnly})=>{
      const Three=await import(moduleUrl);
      const start=source.indexOf('/* Fazenda Viva'),end=source.indexOf('function makeTrees');
      const models=new Function('THREE',source.slice(start,end)+';return {makeHorse,makeWorker};')(Three);
      document.querySelectorAll('[data-qa-sheet]').forEach(el=>el.remove());
      const canvas=document.createElement('canvas');
      canvas.dataset.qaSheet='1';
      canvas.style='position:fixed;inset:0;z-index:99999;width:100vw;height:100vh';
      document.body.append(canvas);
      const r=new Three.WebGLRenderer({canvas,antialias:true});r.setSize(innerWidth,innerHeight);r.setPixelRatio(1.5);
      r.setScissorTest(true);
      const labels=equineOnly?['Perfil','Três quartos','Frente','Repouso',
        'Pasto','Caminhada','Potro · perfil','Potro · frente']:movement?['Passada 1','Passada 2','Passada 3','Passada 4',
        'Repouso','Pasto','Descanso no campo','Resposta ao trato',
        'Alimentação','Escovação · ida','Escovação · volta','Agricultor']:
        ['Cavalo · perfil','Cavalo · frente','Cavalo · pasto','Tratador','Agricultor','Administrador'];
      const cols=movement||equineOnly?4:3,rows=movement?3:2;
      for(let i=0;i<labels.length;i++){
        const width=innerWidth/cols,height=innerHeight/rows,x=(i%cols)*width,row=Math.floor(i/cols),y=innerHeight-(row+1)*height;
        r.setViewport(x,y,width,height);r.setScissor(x,y,width,height);
        const scene=new Three.Scene();scene.background=new Three.Color('#e4ddcc');
        scene.add(new Three.HemisphereLight(0xfff0d9,0x777e65,2));
        const light=new Three.DirectionalLight(0xffffff,1.9);light.position.set(-5,9,6);scene.add(light);
        const isHorse=equineOnly||(movement?i<8:i<3),walking=(movement&&i<4)||(equineOnly&&i===5);
        const horse={id:1,coat:'#9a6545',age:equineOnly&&i>=6?.5:4,motion:'idle',phase:1,gait:walking?1.2+i*Math.PI/2:0,
          careKind:'alimentacao',pose:{walk:walking?1:0,
            graze:i===(equineOnly?4:movement?5:2)?1:0,rest:movement&&i===6?1:0,care:movement&&i===7?1:0}};
        const roles=['tratador','agricultor','administrador'];
        const role=movement?(i===11?'agricultor':'tratador'):roles[i-3];
        const entity=isHorse?horse:{id:i,role,motion:movement?'work':'idle',gait:0,
          animTime:i===10?1.5:.8,serviceKind:i===8?'alimentacao':'escovacao',
          pose:{work:movement?1:0,walk:0},color:role==='agricultor'?'#ad8c57':'#658481'};
        const model=isHorse?models.makeHorse(horse):models.makeWorker(entity);
        const pose=isHorse?window.FazendaVivaMotion.horse(entity):window.FazendaVivaMotion.worker(entity);
        model.userData.legs.forEach((leg,j)=>{leg.position.y=pose.legRoot||leg.position.y;leg.rotation.z=pose.legs[j].hip;
          model.userData.knees[j].rotation.z=pose.legs[j].knee;
          (model.userData.hooves||model.userData.boots)[j].rotation.z=-(pose.legs[j].hip+pose.legs[j].knee)});
        if(isHorse){model.userData.neck.rotation.z=pose.neck;
          model.userData.body.position.y=pose.bodyBob||0;
          model.userData.neck.position.y=(window.FazendaVivaMotion.horseRig?.neckY??2.58)+(pose.bodyBob||0)-pose.neckDrop;
          model.userData.head.rotation.z=pose.head;model.userData.tail.rotation.z=pose.tail;
          model.userData.tail.position.y=(window.FazendaVivaMotion.horseRig?.tailY??2.65)+(pose.bodyBob||0);
          model.userData.ears?.forEach((ear,j)=>ear.rotation.z=pose.ears?.[j]||0)}
        else{model.userData.arms.forEach((arm,j)=>{arm.rotation.z=pose.arms[j]+(j===1?pose.tool:0);
          if(model.userData.elbows)model.userData.elbows[j].rotation.z=pose.elbows[j]});
          model.userData.upper.rotation.z=pose.lean;model.userData.upper.position.y=pose.bodyBob||0;
          model.userData.tool.rotation.z=pose.tool;
          if(model.userData.brush){model.userData.brush.visible=pose.action==='brush';model.userData.bucket.visible=pose.action!=='brush'}}
        if(isHorse){const scale=window.FazendaVivaMotion.horseScale(entity.age);model.scale.set(scale.x,scale.y,scale.z)}
        scene.add(model);
        const camera=new Three.OrthographicCamera(-3.7,3.7,3.7*height/width,-3.7*height/width,.1,100);
        const front=equineOnly?(i===2||i===7):!movement&&i===1;
        camera.position.set(front?12:equineOnly&&i===1?8:isHorse?0:8,5,front?0:12);camera.lookAt(0,1.9,0);
        r.render(scene,camera);
        const label=document.createElement('div');label.textContent=labels[i];
        label.dataset.qaSheet='1';
        label.style=`position:fixed;z-index:100000;left:${x+12}px;top:${row*height+14}px;color:#394538;font:600 15px system-ui`;
        document.body.append(label);
      }
    },{source,moduleUrl:url+'/node_modules/three/build/three.module.js',movement,equineOnly});
    await page.screenshot({path:resolve(output,name)});
  }
  await basePage.setViewportSize({width:1050,height:720});
  await characterSheet(basePage,'baseline-0.9.9.11-personagens.png',baseline);
  await basePage.setViewportSize({width:1280,height:800});
  await characterSheet(basePage,'baseline-0.9.9.11-cavalos.png',baseline,false,true);
  await baseContext.close();

  for(const [width,height] of (process.env.FAZENDA_BROWSER_FOCUS==='finish'?[]:[[390,844],[320,568],[360,640],[844,390],[1365,900]])){
    const {context,page}=await open(width,height);
    await page.waitForTimeout(350);
    const day=await page.evaluate(()=>window.FazendaVivaBridge.state().day);
    assert.equal(day,1,'guia deve pausar a simulação no dia 1');
    await page.screenshot({path:resolve(output,`0.9.9.12-guide-${width}x${height}.png`)});
    await page.locator('#guideSkip').click();
    await page.locator('#pause').click();
    const landscape=await page.evaluate(()=>{const t=window.FazendaVivaBridge.state().terrain;return {areas:t.areas.length,sprigs:t.sprigs.length}});
    assert.ok(landscape.areas>100&&landscape.sprigs>200,'solo e vegetação compartilhados devem existir');
    const after=await measurements(page);
    console.log('RENDER',width+'x'+height,JSON.stringify(after));
    assert.ok(after.calls<300,'orçamento inicial: menos de 300 chamadas na visão local');
    if(width===390)assert.ok(after.calls<=before.calls*1.10,'rotina deve preservar o orçamento de chamadas da 0.9.9.11');
    if(width===390)assert.ok(after.triangles<=before.triangles*1.08,'rotina deve preservar o orçamento de triângulos');
    await page.screenshot({path:resolve(output,`0.9.9.12-world-${width}x${height}.png`)});
    assert.ok(await page.locator('#hud .brand').evaluate(el=>el.scrollWidth<=el.clientWidth),
      'a versão inteira deve caber no HUD');
    const bounds=await page.evaluate(()=>{
      const ids=['hud','economy','growthHud','topTools','bottom','zoomTools'];
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
    for(const section of ['resumo','financas','cavalos','equipe','mercado','metas','ambiente']){
      await page.locator('#tab-'+section).click();
      assert.ok((await page.locator('#manageBody').innerText()).length>60);
      const fits=await page.locator('#manageBody').evaluate(el=>el.scrollWidth<=el.clientWidth+1);
      assert.ok(fits,'conteúdo da gestão transborda horizontalmente: '+section);
    }
    if(width===390){
      const audio=await page.evaluate(()=>window.FazendaVivaBridge.state().audio);
      assert.equal(audio.unlocked,true,'áudio desbloqueia após gesto real');
      assert.equal(audio.state,'running');
      await page.locator('#manageClose').click();
      await page.locator('#soundToggle').click();
      assert.equal(await page.evaluate(()=>window.FazendaVivaBridge.state().audio.enabled),false);
      await page.locator('#soundToggle').click();
      await page.locator('#manageQuick').click();
      await page.locator('#tab-ambiente').click();
      await page.locator('#masterVolume').evaluate(el=>{el.value='24';el.dispatchEvent(new Event('input',{bubbles:true}))});
      await page.locator('#ambientVolume').evaluate(el=>{el.value='38';el.dispatchEvent(new Event('input',{bubbles:true}))});
      const setting=await page.evaluate(()=>window.FazendaVivaBridge.state().audio);
      assert.equal(setting.volume,.24);assert.equal(setting.ambience,.38);
      assert.equal(await page.locator('#masterValue').innerText(),'24%');
      await page.screenshot({path:resolve(output,'0.9.9.12-ambiente.png')});
      await page.locator('#tab-resumo').click();
      assert.ok((await page.locator('#manageBody').innerText()).includes('Diário de crescimento'));
      await page.screenshot({path:resolve(output,'0.9.9.12-crescimento.png')});
    }
    await page.locator('#tab-cavalos').click();
    await page.screenshot({path:resolve(output,`0.9.9.12-management-${width}x${height}.png`)});
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
      await page.screenshot({path:resolve(output,'0.9.9.12-horse-close-3d.png')});
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
      await page.screenshot({path:resolve(output,'0.9.9.12-horse-close-2d.png')});
      await page.locator('#renderMode').click();
      await page.locator('#pause').click();
    }
    await page.mouse.move(width*.45,height*.55);
    await page.mouse.down();await page.mouse.move(width*.45+28,height*.55,{steps:4});await page.mouse.up();
    assert.equal(await page.evaluate(()=>window.FazendaVivaBridge.state().followTarget),null,'arrasto encerra acompanhamento');
    await page.locator('#focus').click();
    const previousView=await page.evaluate(()=>{const s=window.FazendaVivaBridge.state();return {zoom:s.zoom,x:s.panX,y:s.panY}});
    await page.locator('#observe').click();
    assert.equal(await page.evaluate(()=>window.FazendaVivaBridge.state().observing),true);
    assert.equal(await page.locator('#hud').isVisible(),false);
    assert.equal(await page.locator('#observeTools').isVisible(),true);
    assert.ok(await page.evaluate(()=>window.FazendaVivaBridge.state().zoom>6.8),'Contemplar deve aproximar o personagem');
    await page.waitForTimeout(1200);
    await page.screenshot({path:resolve(output,`0.9.9.12-contemplar-${width}x${height}.png`)});
    await page.locator('#observeNext').click();
    assert.ok(await page.evaluate(()=>window.FazendaVivaBridge.state().followTarget));
    await page.locator('#observeExit').click();
    assert.equal(await page.locator('#hud').isVisible(),true);
    assert.equal(await page.locator('#observeTools').isVisible(),false);
    assert.deepEqual(await page.evaluate(()=>{const s=window.FazendaVivaBridge.state();return {zoom:s.zoom,x:s.panX,y:s.panY}}),previousView,'sair de Contemplar restaura o enquadramento anterior');
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
    await page.screenshot({path:resolve(output,`0.9.9.12-2d-${width}x${height}.png`)});
    await page.locator('#renderMode').click();
    assert.equal(await page.locator('#error').isVisible(),false);
    if(width===390){
      await page.locator('#manageQuick').click();await page.locator('#tab-mercado').click();
      assert.ok((await page.locator('#manageBody').innerText()).includes('As quatro bancas'));
      await page.locator('[data-mgaction="visitFair"]').click();
      await page.screenshot({path:resolve(output,'0.9.9.12-centro-rural-3d.png')});
      await page.mouse.click(width/2,height/2);
      assert.equal(await page.locator('#management').isVisible(),true,'toque no Centro Rural abre o mercado');
      assert.equal(await page.locator('#tab-mercado').getAttribute('aria-selected'),'true');
      await page.locator('#manageClose').click();
      await page.locator('#renderMode').click();
      await page.screenshot({path:resolve(output,'0.9.9.12-centro-rural-2d.png')});
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
      await page.screenshot({path:resolve(output,'0.9.9.12-regional-3d.png')});
      assert.equal(await page.evaluate(()=>window.FazendaVivaBridge.state().owners.length),5);
      await page.locator('#focus').click();
      await page.locator('#toggle').click();
      await page.locator('#viewWorkers').click();
      await page.locator('#pause').click();
      for(let i=0;i<4;i++)await page.locator('#zoomIn').click();
      await page.waitForTimeout(1200);
      await page.screenshot({path:resolve(output,'0.9.9.12-worker-close-3d.png')});
      await page.locator('#renderMode').click();
      await page.screenshot({path:resolve(output,'0.9.9.12-worker-close-2d.png')});
      await page.locator('#renderMode').click();
    }
    results.push({version:'0.9.9.12',viewport:width+'x'+height,...after});
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
  await page.screenshot({path:resolve(output,'0.9.9.12-pastoreio-3d.png')});
  await page.locator('#renderMode').click();
  await page.screenshot({path:resolve(output,'0.9.9.12-pastoreio-2d.png')});
  await page.locator('#renderMode').click();
  await page.screenshot({path:resolve(output,'0.9.9.12-restored-webgl.png')});
  const natural=await page.evaluate(()=>{
    const s=window.FazendaVivaBridge.state();
    return {serviced:s.buildings.filter(b=>b.routine?.last).length,
      workers:s.farmers.filter(f=>f.lastService).length};
  });
  assert.ok(natural.serviced>0&&natural.workers>0,'tarefas naturais devem atualizar instalações no navegador');
  console.log('ROTINA REAL',JSON.stringify(natural));
  // Comparação visual controlada; a simulação natural foi verificada acima e no smoke.
  await page.locator('#focus').click();await page.locator('#observe').click();
  const penView=await page.evaluate(()=>{
    const s=window.FazendaVivaBridge.state(),o=s.owners[0];
    const list=s.buildings.filter(b=>b.o===o&&b.status!=='building');
    return s.horses.filter(h=>h.o===o).length+s.farmers.filter(f=>f.o===o).length+list.findIndex(b=>b.type==='paddock');
  });
  for(let i=0;i<penView;i++)await page.locator('#observeNext').click();
  await page.locator('#zoomIn').click();await page.locator('#zoomIn').click();
  await page.evaluate(()=>{
    const s=window.FazendaVivaBridge.state(),b=s.buildings.find(b=>b.o===s.owners[0]&&b.type==='paddock');
    window.__qaRoutine=b.routine;b.routine={};
  });
  await page.waitForTimeout(600);
  await page.screenshot({path:resolve(output,'0.9.9.12-rotina-antes-3d.png')});
  await page.evaluate(()=>{
    const s=window.FazendaVivaBridge.state(),b=s.buildings.find(b=>b.o===s.owners[0]&&b.type==='paddock'),r=window.FazendaVivaRoutine;
    r.record(b,{role:'tratador',kind:'alimentacao',horseId:1,day:s.day});
    r.record(b,{role:'tratador',kind:'limpeza',day:s.day});
    for(let i=0;i<4;i++)r.record(b,{role:'agricultor',day:s.day});
  });
  await page.waitForTimeout(600);
  await page.screenshot({path:resolve(output,'0.9.9.12-rotina-depois-3d.png')});
  // Contemplar oculta os controles superiores; a troca manual já foi testada acima.
  await page.evaluate(()=>document.getElementById('renderMode').click());
  await page.screenshot({path:resolve(output,'0.9.9.12-rotina-depois-2d.png')});
  await page.locator('#observeExit').click();await page.locator('#manageQuick').click();
  await page.locator('#tab-equipe').click();
  assert.ok((await page.locator('#manageBody').innerText()).includes('Marcas do trabalho'));
  await page.screenshot({path:resolve(output,'0.9.9.12-rotina-equipe.png')});
  await page.evaluate(()=>{
    const s=window.FazendaVivaBridge.state();s.buildings.find(b=>b.o===s.owners[0]&&b.type==='paddock').routine=window.__qaRoutine;
  });
  await context.close();
  const sheet=await open(1050,720);
  await characterSheet(sheet.page,'0.9.9.12-personagens.png',root);
  await sheet.page.setViewportSize({width:1280,height:960});
  await characterSheet(sheet.page,'0.9.9.12-movimento.png',root,true);
  await sheet.page.setViewportSize({width:1280,height:800});
  await characterSheet(sheet.page,'0.9.9.12-cavalos.png',root,false,true);
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
