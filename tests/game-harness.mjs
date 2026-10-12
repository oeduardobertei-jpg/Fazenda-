// Simulação real com relógio controlado, sem renderização ou temporizadores externos.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
export function gameHarness(){
 const noop=()=>{},ctx=new Proxy({setTransform:noop,createRadialGradient:()=>({addColorStop:noop})},
  {get:(o,k)=>o[k]??noop,set:(o,k,v)=>{o[k]=v;return true}});
 const ids='observe observeTools observeCaption observeNext observePause observeExit soundToggle growthHud growthTitle growthLevel growthDetail growthFill game date money buildings economy status panel actions buyhorse upgrade news pause speed focus map toggle visitFarm viewWorkers workerReport graphicsMode perfMode perfHud renderMode renderStatus error zoomIn zoomOut resetGame manageOpen management manageClose manageTabs manageBody manageQuick panelClose sceneContext contextText contextCancel welcome guideTitle guideText guideHint guideProgress guideNext guideSkip helpOpen'.split(' ');
 const ui=new Map(ids.map(id=>[id,{id,hidden:true,style:{},textContent:'',innerHTML:'',scrollTop:0,
  callbacks:{},getContext:()=>ctx,querySelectorAll:()=>[],setAttribute:noop,
  addEventListener(name,fn){this.callbacks[name]=fn},setPointerCapture:noop,releasePointerCapture:noop,hasPointerCapture:()=>false}]));
 let frame=()=>{},clock=0;
 const globals={window:{FazendaVivaMotion:require('../motion.js'),FazendaVivaAudio:require('../audio.js'),
  FazendaVivaTerrain:require('../terrain.js'),FazendaVivaRoutine:require('../routine.js')},
  document:{getElementById:id=>{assert.ok(ui.has(id),id);return ui.get(id)},addEventListener:noop},
  innerWidth:390,innerHeight:844,devicePixelRatio:2,addEventListener:noop,
  performance:{now:()=>clock},requestAnimationFrame:fn=>frame=fn,
  localStorage:{getItem:()=>null,setItem:()=>{throw Error('não pode salvar')},removeItem:noop},
  MutationObserver:class{observe(){}},setTimeout:()=>0,clearTimeout:noop,confirm:()=>true,location:{reload:noop}};
 const old=new Map();for(const [k,v] of Object.entries(globals)){old.set(k,globalThis[k]);globalThis[k]=v}
 const restore=()=>{for(const [k,v] of old)if(v===undefined)delete globalThis[k];else globalThis[k]=v};
 try{
  const script=html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)[1];
  new Function(script.replace('window.FazendaVivaBridge={',
   'window.__careQA={careMeeting,animateFarmers,workerSafe,movePastureHorse};window.FazendaVivaBridge={'))();
  ui.get('guideSkip').onclick();window.FazendaVivaBridge.mode(true);
  return {ui,state:()=>window.FazendaVivaBridge.state(),helpers:window.__careQA,
   advance(ms){clock+=ms;frame(clock);assert.equal(ui.get('error').textContent,'')},restore};
 }catch(e){restore();throw e}
}
