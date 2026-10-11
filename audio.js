/* Fazenda Viva — paisagem sonora original, sintetizada localmente.
 * O relógio do áudio é independente da velocidade da simulação. */
(() => {
  'use strict';
  const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
  function create(host=globalThis){
    let context,master,ambient,wind,timer,unlocked=false,enabled=true,visible=true;
    let volume=.32,ambience=.55,voices=0,lastCue=-10,lastBird=-20,cues=0;
    function gains(){
      if(!context)return;
      const t=context.currentTime;
      master.gain.setTargetAtTime(enabled&&visible?volume:0,t,.12);
      ambient.gain.setTargetAtTime(ambience,t,.6);
    }
    function tone(frequency,time,duration,level=.06,type='sine',end=frequency){
      if(!context||voices>=20)return;
      const oscillator=context.createOscillator(),gain=context.createGain();
      oscillator.type=type;
      oscillator.frequency.setValueAtTime(frequency,time);
      oscillator.frequency.exponentialRampToValueAtTime(end,time+duration);
      gain.gain.setValueAtTime(0,time);
      gain.gain.linearRampToValueAtTime(level,time+.018);
      gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
      oscillator.connect(gain);gain.connect(master);voices++;
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();voices--};
      oscillator.start(time);oscillator.stop(time+duration+.03);
    }
    function bird(){
      if(!unlocked||!enabled||!visible||!ambience||context.state!=='running')return;
      const now=context.currentTime;
      if(now-lastBird<9||Math.random()>.42)return;
      lastBird=now;
      for(let i=0;i<3;i++)tone(1400+i*180,now+i*.16,.11,.012*ambience,'sine',2100+i*130);
    }
    async function unlock(){
      if(!enabled||!visible)return false;
      try{
        if(!context){
          const Audio=host.AudioContext||host.webkitAudioContext;
          if(!Audio)return false;
          context=new Audio();master=context.createGain();ambient=context.createGain();
          master.gain.value=0;ambient.gain.value=ambience;
          master.connect(context.destination);ambient.connect(master);
          const buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate);
          const channel=buffer.getChannelData(0);let previous=0;
          for(let i=0;i<channel.length;i++){
            previous=(previous+Math.random()*.04-.02)/1.02;channel[i]=previous;
          }
          wind=context.createBufferSource();wind.buffer=buffer;wind.loop=true;
          const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=480;
          const gain=context.createGain();gain.gain.value=.13;
          wind.connect(filter);filter.connect(gain);gain.connect(ambient);wind.start();
          timer=host.setInterval(bird,3000);
        }
        await context.resume();unlocked=true;gains();return true;
      }catch{return false}
    }
    function cue(kind='tap'){
      if(!unlocked||!enabled||!visible||!volume||context.state!=='running')return;
      const now=context.currentTime;
      if(now-lastCue<.12)return;
      lastCue=now;cues++;
      const notes=kind==='milestone'?[392,494,587]:kind==='birth'?[440,554,659,880]:
        kind==='build'?[294,392]:kind==='confirm'?[330,440]:[520];
      notes.forEach((f,i)=>tone(f,now+i*.09,kind==='tap'?.10:.38,
        kind==='tap'?.025:.045,'sine'));
    }
    function setEnabled(value){enabled=!!value;gains();if(enabled)void unlock()}
    function setVisible(value){
      visible=!!value;gains();
      if(!context)return;
      if(!visible)void context.suspend().catch(()=>{});
      else if(unlocked&&enabled)void context.resume().then(gains).catch(()=>{});
    }
    return Object.freeze({unlock,cue,setEnabled,setVisible,
      setVolume:value=>{volume=clamp(value);gains()},
      setAmbience:value=>{ambience=clamp(value);gains()},
      snapshot:()=>({enabled,volume,ambience,unlocked,visible,
        state:context?.state||'locked',voices,cues}),
      dispose:()=>{if(timer)host.clearInterval(timer);if(context)void context.close()}
    });
  }
  const api=Object.freeze({create});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else window.FazendaVivaAudio=api;
})();
