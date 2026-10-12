// Revisão WebGL focada nas dimensões reais das instalações após ajuste de posições.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=resolve(fileURLToPath(new URL('..',import.meta.url))),output=resolve(root,'qa-artifacts');
mkdirSync(output,{recursive:true});
const server=createServer((req,res)=>{
 const file=resolve(root,new URL(req.url,'http://localhost').pathname.slice(1)||'index.html');
 if(!file.startsWith(root+'/')){res.writeHead(403);res.end();return}
 try{res.writeHead(200,{'Content-Type':extname(file)==='.js'?'text/javascript':extname(file)==='.css'?'text/css':'text/html'});res.end(readFileSync(file))}
 catch{res.writeHead(404);res.end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&/Shader Error|shader.*compil|VALIDATE_STATUS/i.test(m.text()))errors.push(m.text())});
 await page.route(/https:\/\/(cdn\.jsdelivr\.net|unpkg\.com)\/.*three.*three\.module\.js/,
  r=>r.fulfill({path:resolve(root,'node_modules/three/build/three.module.js'),contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'}}));
 await page.goto(url);
 await page.waitForFunction(()=>window.FazendaViva3DReady&&window.FazendaVivaBridge);
 const data=await page.evaluate(async ({source,moduleUrl})=>{
  const T=await import(moduleUrl),start=source.indexOf('/* Fazenda Viva'),end=source.indexOf('function makeTrees');
  const models=new Function('THREE',source.slice(start,end)+';return {building,batchStaticMeshes};')(T);
  const canvas=document.createElement('canvas');canvas.style='position:fixed;inset:0;z-index:99999';document.body.append(canvas);
  const renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(1280,800);renderer.setScissorTest(true);
  const owner=window.FazendaVivaBridge.state().owners[0],r=window.FazendaVivaRoutine,result=[];
  const sizes=[['paddock',20,16,'Piquete'],['stable',17,10,'Cocheira'],['barn',16,13,'Galpão']];
  for(let row=0;row<2;row++)for(let col=0;col<3;col++){
   const [type,w,h,label]=sizes[col],b={o:owner,type,w,h,x:0,y:0,status:'complete',tier:1};
   if(row){r.record(b,{role:'tratador',kind:'alimentacao',horseId:1,day:1});r.record(b,{role:'tratador',kind:'limpeza',day:1});
    for(let i=0;i<4;i++)r.record(b,{role:'agricultor',day:1})}
   const props=r.props(b,1);
   for(const p of props)if(Math.abs(p.x)+p.w/2>=w/2||Math.abs(p.z)+p.d/2>=h/2)throw Error('Objeto fora do lote: '+type+' '+p.kind);
   const scene=new T.Scene();scene.background=new T.Color('#e4ddcc');scene.add(new T.HemisphereLight(0xfff0d9,0x777e65,2));
   const light=new T.DirectionalLight(0xffffff,1.9);light.position.set(-8,18,10);scene.add(light);
   const model=models.batchStaticMeshes(models.building(b,true,1));scene.add(model);
   const camera=new T.OrthographicCamera(-16,16,15,-15,.1,150);camera.position.set(25,24,30);camera.lookAt(0,2,0);
   const x=col*1280/3,y=(1-row)*400;renderer.setViewport(x,y,1280/3,400);renderer.setScissor(x,y,1280/3,400);renderer.render(scene,camera);
   const title=document.createElement('div');title.textContent=label+' · '+(row?'após serviços':'antes');
   title.style=`position:fixed;z-index:100000;left:${x+14}px;top:${row*400+12}px;color:#394538;font:600 16px system-ui`;document.body.append(title);
   result.push({type,serviced:!!row,props:props.length,calls:renderer.info.render.calls});
  }
  return result;
 },{source:readFileSync(resolve(root,'world3d.js'),'utf8'),moduleUrl:url+'/node_modules/three/build/three.module.js'});
 await page.screenshot({path:resolve(output,'0.9.9.12-instalacoes-servicos.png')});
 assert.deepEqual(errors,[]);
 assert.ok(data.filter(d=>d.serviced).every(d=>d.props>0));
 writeFileSync(resolve(output,'service-results.json'),JSON.stringify({data,errors},null,2));
 console.log('PASS WebGL instalações reais',JSON.stringify(data));
}finally{await browser.close();await new Promise(r=>server.close(r))}
