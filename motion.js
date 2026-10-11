/* Poses leves compartilhadas: os renderizadores interpretam a mesma animação.
 * Sem relógio próprio, aleatoriedade ou dependência de Three.js. */
(() => {
  'use strict';
  const TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  // Secções da mesma anatomia nos dois renderizadores: centro X/altura,
  // raio vertical e largura. Os anéis acompanham a curva de cada volume.
  const horseForm=Object.freeze({
    // Garupa larga, dorso menos tubular e cernelha elevada sobre o ombro.
    body:[[-2.00,2.32,.13,.18],[-1.80,2.38,.46,.54],[-1.48,2.40,.65,.73],
      [-1.08,2.34,.66,.72],[-.63,2.28,.61,.65],[-.10,2.28,.60,.62],
      [.40,2.35,.65,.65],[.77,2.40,.72,.64],[1.08,2.28,.63,.52],
      [1.35,2.15,.45,.35],[1.48,2.15,.14,.18]],
    // Base muscular ligada ao peito; a crista arqueia até a nuca.
    neck:[[-.08,-.32,.51,.42],[.00,-.02,.54,.42],[.14,.31,.49,.35],
      [.30,.61,.40,.29],[.46,.88,.31,.25],[.63,1.08,.23,.22],[.76,1.15,.15,.19]],
    // Mandíbula distinta do chanfro: cabeça encorpada e focinho inclinado.
    head:[[-.14,.04,.15,.19],[.03,.02,.30,.27],[.24,-.04,.33,.29],
      [.45,-.18,.28,.25],[.68,-.35,.22,.22],[.88,-.48,.18,.21],[1.05,-.53,.16,.20]],
    muzzle:[[.98,-.51,.17,.22],[1.12,-.54,.18,.23],[1.22,-.54,.13,.20]],
    ear:[[0,0,.09,.08],[-.025,.13,.065,.06],[.01,.29,.008,.012]],
    mane:[[-.50,.01,.075,.09],[-.42,.34,.075,.09],[-.27,.64,.07,.085],
      [-.10,.90,.065,.08],[.10,1.13,.06,.075],[.31,1.28,.055,.065],[.57,1.32,.035,.055]],
    forelock:[[-.12,.27,.075,.10],[.06,.29,.075,.11],[.25,.17,.035,.08]],
    tail:[[0,0,.10,.11],[-.15,-.20,.14,.14],[-.29,-.57,.17,.18],
      [-.34,-.99,.17,.17],[-.28,-1.37,.10,.12],[-.15,-1.59,.025,.035]],
    hindLeg:[[-.05,.62,.26,.27],[-.08,.31,.28,.25],[.03,.02,.21,.18],
      [.12,-.30,.13,.13],[0,-.73,.105,.105]],
    foreLeg:[[-.06,.66,.22,.23],[-.03,.28,.21,.19],[.01,-.05,.14,.13],
      [.02,-.40,.09,.095],[0,-.73,.085,.09]],
    shin:[[0,0,.105,.105],[.02,-.13,.08,.08],[.035,-.43,.07,.075],
      [.035,-.60,.095,.10],[.025,-.68,.075,.085]],
    hoof:[[-.10,0,.115,.12],[.05,0,.12,.13],[.19,-.01,.09,.11]]
  });
  // Uma única referência de articulações para WebGL, Canvas e pranchas de QA.
  const horseRig=Object.freeze({neckX:1.12,neckY:2.55,headX:.74,headY:1.08,
    tailX:-1.82,tailY:2.66,legXs:[-1.29,1.12],legZ:.44});
  // Volumes eretos compartilhados no Canvas e WebGL; rosto voltado a +X.
  const workerForm=Object.freeze({
    torso:[[0,1.18,.25,.31],[0,1.38,.28,.36],[0,1.81,.29,.43],
      [0,2.17,.27,.48],[0,2.34,.21,.35],[0,2.40,.15,.20]],
    head:[[0,2.69,.18,.21],[.01,2.80,.27,.30],[0,3.05,.30,.31],
      [-.015,3.27,.24,.25],[0,3.36,.10,.13]],
    sleeve:[[0,.03,.14,.15],[0,-.15,.16,.16],[.01,-.49,.12,.13]],
    forearm:[[0,0,.12,.12],[.02,-.23,.105,.105],[.035,-.48,.08,.085]],
    hand:[[.035,-.46,.10,.09],[.06,-.60,.105,.09],[.04,-.69,.055,.065]],
    thigh:[[0,.05,.18,.20],[0,-.20,.17,.19],[0,-.51,.135,.15]],
    shin:[[0,0,.13,.15],[0,-.28,.115,.13],[0,-.52,.10,.12]],
    boot:[[-.10,0,.11,.14],[.06,0,.11,.15],[.24,-.03,.08,.14]]
  });
  function workerLook(entity){
    const id=entity.id||0,role=entity.role;
    return {skin:['#cf9971','#a96f4f','#e0b18a','#b6815c'][id%4],
      shirt:entity.color||'#759389',pants:role==='agricultor'?'#53616a':'#54544a',
      hat:role==='tratador'?'#748b8a':role==='agricultor'?'#c4a570':'#777663',
      hair:['#48352b','#654834','#342b27'][id%3],beard:id%3===0};
  }

  function volume(rings,sides=12){
    const vertices=[],faces=[];
    rings.forEach(([x,y,r,width],i)=>{
      const prev=rings[Math.max(0,i-1)],next=rings[Math.min(rings.length-1,i+1)];
      const dx=next[0]-prev[0],dy=next[1]-prev[1],len=Math.hypot(dx,dy)||1;
      for(let j=0;j<sides;j++){
        const a=j*TAU/sides;
        vertices.push([x-dy/len*r*Math.cos(a),y+dx/len*r*Math.cos(a),width*Math.sin(a)]);
      }
      if(i)for(let j=0;j<sides;j++)faces.push([(i-1)*sides+j,(i-1)*sides+(j+1)%sides,
        i*sides+(j+1)%sides,i*sides+j]);
    });
    faces.push(Array.from({length:sides},(_,i)=>sides-1-i),
      Array.from({length:sides},(_,i)=>(rings.length-1)*sides+i));
    return {vertices,faces};
  }
  function blend(entity,dt){
    const pose=entity.pose||(entity.pose={walk:0,graze:0,work:0,care:0});
    const weight=1-Math.exp(-Math.max(0,Math.min(.25,dt))*7);
    for(const [key,active] of Object.entries({
      walk:entity.motion==='walk',graze:entity.motion==='graze',
      work:entity.motion==='work',care:!!entity.interacting
    }))pose[key]+=((active?1:0)-pose[key])*weight;
    return pose;
  }
  function legPose(phase,weight,upper=.73,lower=.75,height=1.43,bend=1){
    const cycle=((phase/TAU)%1+1)%1;
    const stance=.62;
    // O casco fica no chão durante apoio e retorna por um arco durante balanço.
    const swing=cycle<stance?0:(cycle-stance)/(1-stance);
    const x=(cycle<stance?.34*(1-2*cycle/stance):-.34*Math.cos(swing*Math.PI))*weight;
    const lift=Math.sin(swing*Math.PI)*.24*weight;
    const down=height-lift;
    const distance=clamp(Math.hypot(x,down),.01,upper+lower-.001);
    const offset=Math.acos(clamp((upper*upper+distance*distance-lower*lower)/(2*upper*distance),-1,1));
    const knee=Math.PI-Math.acos(clamp((upper*upper+lower*lower-distance*distance)/(2*upper*lower),-1,1));
    return {hip:Math.atan2(x,down)-bend*offset,knee:bend*knee,x,lift};
  }
  function horse(entity){
    const pose=entity.pose||{walk:entity.motion==='walk'?1:0,graze:entity.motion==='graze'?1:0,care:entity.interacting?1:0};
    const walk=pose.walk||0,graze=pose.graze||0,care=pose.care||0;
    const phase=entity.gait||0,time=entity.phase||0;
    return {
      walk,graze,care,legRoot:1.599-.049*walk,
      // O focinho alcança o capim: duas articulações, com transição contínua.
      neck:-.06-graze*1.42+care*.06+Math.sin(time*.65+entity.id)*.022*(1-walk),
      head:-.12+graze*.34+Math.sin(time*1.1)*.018,
      tail:-.12+Math.sin(time*.8+entity.id)*(.11+care*.08),
      bodyBob:Math.sin(phase*2)*.012*walk,neckDrop:graze*.28,
      legs:[0,Math.PI,Math.PI/2,Math.PI*1.5].map((offset,i)=>
        legPose(phase+offset,walk,.73,.75,1.479-.049*walk,i<2?-1:1))
    };
  }
  function worker(entity){
    const pose=entity.pose||{walk:entity.motion==='walk'?1:0,work:entity.motion==='work'?1:0};
    const walk=pose.walk||0,work=pose.work||0,time=entity.animTime||0;
    const phase=entity.gait||0;
    return {
      walk,work,legRoot:1.158-.028*walk,bodyBob:Math.sin(phase*2)*.018*walk,
      legs:[0,Math.PI].map(offset=>legPose(phase+offset,walk,.51,.52,1.028-.028*walk,1)),
      arms:[-Math.sin(phase)*.28*walk,Math.sin(phase)*.28*walk],
      lean:work*(entity.role==='agricultor'?-.15:-.045),
      elbows:[.10+work*.35,.15+work*(entity.role==='administrador'?.85:.60)],
      tool:Math.sin(time*(entity.role==='agricultor'?2.4:3.0))*.13*work
    };
  }
  const motion=Object.freeze({blend,horse,worker,legPose,horseForm,horseRig,workerForm,workerLook,volume});
  if(typeof module!=='undefined'&&module.exports)module.exports=motion;
  else window.FazendaVivaMotion=motion;
})();
