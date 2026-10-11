import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {create}=createRequire(import.meta.url)('../audio.js');
let instance,intervals=0,oscillators=0;
const endings=[];
const parameter=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},
  exponentialRampToValueAtTime(){},setTargetAtTime(){}});
const node=()=>({connect(){},disconnect(){},gain:parameter(),frequency:parameter(),start(){}});
class Context{
  constructor(){instance=this;this.currentTime=0;this.sampleRate=8000;this.state='suspended';this.destination={}}
  createGain(){return node()}
  createBiquadFilter(){return node()}
  createBuffer(){return {getChannelData:()=>new Float32Array(16000)}}
  createBufferSource(){return node()}
  createOscillator(){
    oscillators++;const n=node();n.stop=at=>endings.push({at,n});return n;
  }
  async resume(){this.state='running'}
  async suspend(){this.state='suspended'}
  async close(){this.state='closed'}
}
const audio=create({AudioContext:Context,setInterval(){intervals++;return 1},clearInterval(){intervals--}});
audio.cue('tap');assert.equal(oscillators,0,'nenhum som antes de gesto autorizado');
await audio.unlock();assert.equal(audio.snapshot().state,'running');
await audio.unlock();assert.equal(intervals,1,'desbloquear repetidamente não duplica ambiente');
audio.cue('milestone');assert.equal(oscillators,3);
audio.cue('milestone');assert.equal(oscillators,3,'eventos próximos não empilham sons');
audio.setEnabled(false);instance.currentTime+=1;audio.cue('birth');
assert.equal(oscillators,3,'silêncio vale para todas as confirmações');
audio.setVisible(false);assert.equal(instance.state,'suspended');
audio.setEnabled(true);await Promise.resolve();
assert.equal(instance.state,'suspended','reativar não toca numa aba oculta');
audio.setVisible(true);await Promise.resolve();assert.equal(instance.state,'running');
audio.setVolume(4);audio.setAmbience(-1);
assert.equal(audio.snapshot().volume,1);assert.equal(audio.snapshot().ambience,0);
for(let i=0;i<20;i++){instance.currentTime+=.2;audio.cue('birth')}
assert.ok(audio.snapshot().voices<=20,'vozes simultâneas têm limite');
for(const {n} of endings)n.onended();assert.equal(audio.snapshot().voices,0);
audio.dispose();assert.equal(intervals,0);assert.equal(instance.state,'closed');
const unsupported=create({});assert.equal(await unsupported.unlock(),false);
console.log('PASS áudio: gesto inicial, silêncio, aba oculta, volume e limite de vozes');
