/* Poses leves compartilhadas: os renderizadores interpretam a mesma animação.
 * Sem relógio próprio, aleatoriedade ou dependência de Three.js. */
(() => {
  'use strict';
  const TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const horseStride=Object.freeze({reach:.46,lift:.22,stance:.62});
  const horseGaitPerUnit=TAU*horseStride.stance/(2*horseStride.reach);
  function turnToward(current,target,dt,maxRate=2.8){
    const delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));
    const step=delta*(1-Math.exp(-Math.max(0,dt)*7));
    return current+clamp(step,-maxRate*dt,maxRate*dt);
  }
  const neckForm=[[-.13,-.38,.52,.45],[-.02,-.10,.55,.46],[.14,.18,.50,.40],
    [.30,.47,.41,.33],[.46,.71,.31,.27],[.61,.91,.23,.23],[.69,.99,.13,.18]];
  const headForm=[[-.15,.04,.14,.18],[.01,.03,.29,.27],[.20,-.04,.32,.30],
    [.41,-.15,.27,.25],[.63,-.29,.21,.22],[.83,-.42,.17,.20],[1.00,-.47,.15,.20]];
  // Seguir a superfície real mantém crina/lista ligadas à anatomia em todos
  // os ângulos. O centro fica ligeiramente dentro da pele, sem faixas soltas.
  function surfaceTrace(rings,indices,radius,width,inset){
    return indices.map((i,j)=>{
      const [x,y,r]=rings[i],prev=rings[Math.max(0,i-1)],next=rings[Math.min(rings.length-1,i+1)];
      const dx=next[0]-prev[0],dy=next[1]-prev[1],len=Math.hypot(dx,dy)||1;
      const taper=j===indices.length-1?.55:1;
      return [x-dy/len*(r-inset),y+dx/len*(r-inset),radius*taper,width*taper];
    });
  }
  // Secções da mesma anatomia nos dois renderizadores: centro X/altura,
  // raio vertical e largura. Os anéis acompanham a curva de cada volume.
  const horseForm=Object.freeze({
    // Garupa larga, dorso menos tubular e cernelha elevada sobre o ombro.
    body:[[-1.90,2.27,.13,.19],[-1.70,2.36,.45,.56],[-1.38,2.39,.65,.73],
      [-1.01,2.32,.64,.69],[-.55,2.26,.60,.62],[-.07,2.28,.60,.61],
      [.38,2.39,.68,.65],[.73,2.40,.73,.65],[1.01,2.23,.61,.51],
      [1.27,2.06,.39,.32],[1.36,2.04,.12,.17]],
    // Ombro e anca sobrepõem o tronco e recebem a raiz dos membros.
    // A mesma anatomia é desenhada em Canvas e fundida no WebGL.
    shoulder:[[.56,2.76,.13,.16],[.79,2.47,.33,.26],[.82,2.17,.31,.27],
      [.80,1.87,.23,.21],[.95,1.65,.12,.13]],
    haunch:[[-1.40,2.76,.17,.21],[-1.36,2.46,.36,.31],[-1.23,2.15,.34,.29],
      [-1.09,1.83,.25,.21],[-1.16,1.61,.12,.13]],
    // Base muscular ligada ao peito; a crista arqueia até a nuca.
    neck:neckForm,
    // Mandíbula distinta do chanfro: cabeça encorpada e focinho inclinado.
    head:headForm,
    muzzle:[[.94,-.46,.17,.22],[1.08,-.48,.18,.23],[1.18,-.48,.13,.20]],
    ear:[[0,0,.09,.08],[-.025,.13,.065,.06],[.01,.29,.008,.012]],
    mane:surfaceTrace(neckForm,[1,2,3,4,5,6],.045,.085,.012),
    forelock:surfaceTrace(headForm,[0,1,2],.032,.075,.012),
    blaze:surfaceTrace(headForm,[2,3,4,5,6],.009,.060,.002),
    tail:[[0,0,.10,.11],[-.15,-.20,.14,.14],[-.29,-.57,.17,.18],
      [-.34,-.99,.17,.17],[-.28,-1.37,.10,.12],[-.15,-1.59,.025,.035]],
    hindLeg:[[-.02,.54,.23,.23],[.06,.30,.26,.24],[.12,.03,.21,.19],
      [.10,-.29,.145,.135],[0,-.73,.105,.105]],
    foreLeg:[[-.08,.54,.20,.21],[-.035,.27,.20,.19],[.01,-.05,.15,.135],
      [.02,-.40,.10,.10],[0,-.73,.09,.095]],
    shin:[[0,0,.105,.105],[.02,-.13,.08,.08],[.035,-.43,.07,.075],
      [.035,-.60,.095,.10],[.025,-.68,.075,.085]],
    hoof:[[-.10,0,.115,.12],[.05,0,.12,.13],[.19,-.01,.09,.11]]
  });
  // Uma única referência de articulações para WebGL, Canvas e pranchas de QA.
  const horseRig=Object.freeze({neckX:1.03,neckY:2.50,headX:.67,headY:.95,
    tailX:-1.78,tailY:2.64,legXs:[-1.23,1.03],legZ:.43});
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
    const pose=entity.pose||(entity.pose={walk:0,graze:0,work:0,care:0,rest:0});
    const weight=1-Math.exp(-Math.max(0,Math.min(.25,dt))*7);
    for(const [key,active] of Object.entries({
      walk:entity.motion==='walk',graze:entity.motion==='graze',
      work:entity.motion==='work',care:!!entity.interacting,
      rest:entity.resting&&entity.motion==='idle'&&!entity.interacting
    }))pose[key]=(pose[key]||0)+((active?1:0)-(pose[key]||0))*weight;
    return pose;
  }
  function legPose(phase,weight,upper=.73,lower=.75,height=1.43,bend=1,stride={reach:.34,lift:.24,stance:.62}){
    const cycle=((phase/TAU)%1+1)%1;
    const stance=stride.stance;
    // O casco fica no chão durante apoio e retorna por um arco durante balanço.
    const swing=cycle<stance?0:(cycle-stance)/(1-stance);
    const x=(cycle<stance?stride.reach*(1-2*cycle/stance):-stride.reach*Math.cos(swing*Math.PI))*weight;
    // A volta tem velocidade zero ao pousar: evita estalo no casco.
    const lift=Math.sin(swing*Math.PI)**2*stride.lift*weight;
    const down=height-lift;
    const distance=clamp(Math.hypot(x,down),.01,upper+lower-.001);
    const offset=Math.acos(clamp((upper*upper+distance*distance-lower*lower)/(2*upper*distance),-1,1));
    const knee=Math.PI-Math.acos(clamp((upper*upper+lower*lower-distance*distance)/(2*upper*lower),-1,1));
    return {hip:Math.atan2(x,down)-bend*offset,knee:bend*knee,x,lift};
  }
  function horse(entity){
    const pose=entity.pose||{walk:entity.motion==='walk'?1:0,graze:entity.motion==='graze'?1:0,care:entity.interacting?1:0};
    const walk=pose.walk||0,graze=pose.graze||0,care=pose.care||0,rest=pose.rest||0;
    const phase=entity.gait||0,time=entity.phase||0;
    const feeding=entity.careKind==='alimentacao'?care:0;
    return {
      walk,graze,care,rest,legRoot:1.599-.079*walk,
      // O focinho alcança o capim: duas articulações, com transição contínua.
      neck:-.06-graze*1.42-feeding*.72-rest*.10+
        Math.sin(time*.65+entity.id)*.018*(1-walk)+Math.sin(phase)*.025*walk,
      head:-.12+graze*.34+Math.sin(time*1.1)*.018+Math.sin(time*3)*.035*care,
      tail:-.12+Math.sin(time*.8+entity.id)*(.075+care*.035-rest*.03),
      ears:[-.04+Math.sin(time*.55+entity.id)*.035-rest*.07,
        .03+Math.sin(time*.65+entity.id+1)*.035-rest*.07],
      bodyBob:-.045*walk+Math.sin(phase*2)*.012*walk,neckDrop:graze*.28,
      legs:[0,Math.PI,Math.PI/2,Math.PI*1.5].map((offset,i)=>
        legPose(phase+offset,walk,.73,.75,1.479-.079*walk,i<2?-1:1,horseStride))
    };
  }
  function worker(entity){
    const pose=entity.pose||{walk:entity.motion==='walk'?1:0,work:entity.motion==='work'?1:0};
    const walk=pose.walk||0,work=pose.work||0,time=entity.animTime||0;
    const phase=entity.gait||0;
    const action=entity.role==='tratador'?(entity.serviceKind==='escovacao'?'brush':
      entity.serviceKind==='alimentacao'?'feed':'clean'):entity.role==='agricultor'?'farm':'write';
    const stroke=Math.sin(time*(action==='brush'?3.4:action==='farm'?2.1:2.7));
    const gestures={
      brush:{arms:[.22,.76+stroke*.16],elbows:[.28,.66-stroke*.12],lean:-.055,tool:stroke*.055},
      feed:{arms:[.10,.56],elbows:[.20,.54+stroke*.045],lean:-.035,tool:-.10+stroke*.025},
      clean:{arms:[.12,.30+stroke*.18],elbows:[.18,.48],lean:-.065,tool:stroke*.09},
      farm:{arms:[.16,.44+stroke*.22],elbows:[.22,.74-stroke*.13],lean:-.15,tool:stroke*.09},
      write:{arms:[.23,.30],elbows:[.42,1.02],lean:-.025,tool:stroke*.025}
    }[action];
    return {
      walk,work,action,legRoot:1.158-.028*walk,bodyBob:Math.sin(phase*2)*.018*walk,
      legs:[0,Math.PI].map(offset=>legPose(phase+offset,walk,.51,.52,1.028-.028*walk,1)),
      arms:[-Math.sin(phase)*.28*walk+gestures.arms[0]*work,
        Math.sin(phase)*.28*walk+gestures.arms[1]*work],
      lean:work*gestures.lean,
      elbows:[.10+(gestures.elbows[0]-.10)*work,.15+(gestures.elbows[1]-.15)*work],
      tool:gestures.tool*work
    };
  }
  function horseScale(age){return age<1?{x:.64,y:.79,z:.67}:age<2?{x:.82,y:.90,z:.85}:{x:1,y:1,z:1}}
  const motion=Object.freeze({blend,horse,worker,legPose,turnToward,horseGaitPerUnit,horseScale,
    horseStride,horseForm,horseRig,workerForm,workerLook,volume});
  if(typeof module!=='undefined'&&module.exports)module.exports=motion;
  else window.FazendaVivaMotion=motion;
})();
