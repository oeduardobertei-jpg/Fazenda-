/* Poses leves compartilhadas: os renderizadores interpretam a mesma animação.
 * Sem relógio próprio, aleatoriedade ou dependência de Three.js. */
(() => {
  'use strict';
  const TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  // Secções da mesma anatomia nos dois renderizadores: centro X/altura,
  // raio vertical e largura. Os anéis acompanham a curva de cada volume.
  const horseForm=Object.freeze({
    body:[[-2.08,2.29,.12,.18],[-1.84,2.33,.48,.53],[-1.50,2.33,.69,.67],
      [-1.02,2.28,.72,.67],[-.40,2.25,.68,.61],[.25,2.30,.65,.58],
      [.78,2.40,.70,.60],[1.15,2.33,.65,.53],[1.48,2.19,.42,.36],[1.60,2.19,.12,.18]],
    neck:[[-.10,-.22,.42,.42],[.05,.07,.47,.40],[.27,.42,.43,.34],
      [.51,.77,.35,.28],[.76,1.10,.27,.23],[.97,1.38,.21,.20]],
    head:[[-.18,.09,.17,.17],[.03,.13,.27,.23],[.29,.09,.31,.26],
      [.52,-.07,.27,.23],[.80,-.25,.21,.20],[1.04,-.35,.17,.19],[1.23,-.37,.14,.18]],
    muzzle:[[1.06,-.35,.15,.20],[1.23,-.37,.16,.20],[1.35,-.39,.10,.16]],
    ear:[[0,0,.10,.095],[-.04,.16,.075,.07],[-.08,.35,.008,.012]],
    mane:[[-.36,-.14,.13,.10],[-.27,.28,.13,.11],[-.05,.67,.12,.10],
      [.20,1.03,.10,.08],[.57,1.39,.07,.06]],
    tail:[[0,0,.12,.12],[-.20,-.37,.16,.16],[-.31,-.84,.17,.17],
      [-.37,-1.25,.13,.14],[-.32,-1.64,.04,.06]],
    hindLeg:[[0,.32,.20,.22],[-.04,.01,.25,.22],[-.09,-.30,.18,.17],[0,-.73,.105,.105]],
    foreLeg:[[0,.34,.15,.17],[0,.04,.18,.17],[.03,-.34,.12,.12],[0,-.73,.08,.09]],
    shin:[[0,0,.10,.10],[0,-.16,.075,.075],[0,-.49,.07,.075],[0,-.66,.095,.10]],
    hoof:[[-.10,0,.115,.12],[.05,0,.12,.13],[.19,-.01,.09,.11]]
  });
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
      walk,graze,care,
      // O focinho alcança o capim: duas articulações, com transição contínua.
      neck:-.10-graze*1.34+care*.10+Math.sin(time*.65+entity.id)*.035*(1-walk),
      head:-.08-graze*.26+Math.sin(time*1.1)*.025,
      tail:-.12+Math.sin(time*.8+entity.id)*(.11+care*.08),
      bodyBob:Math.sin(phase*2)*.016*walk,neckDrop:graze*.22,
      legs:[0,Math.PI,Math.PI/2,Math.PI*1.5].map((offset,i)=>
        legPose(phase+offset,walk,.73,.75,1.43,i<2?-1:1))
    };
  }
  function worker(entity){
    const pose=entity.pose||{walk:entity.motion==='walk'?1:0,work:entity.motion==='work'?1:0};
    const walk=pose.walk||0,work=pose.work||0,time=entity.animTime||0;
    const phase=entity.gait||0;
    return {
      walk,work,bodyBob:Math.sin(phase*2)*.018*walk,
      legs:[0,Math.PI].map(offset=>legPose(phase+offset,walk,.51,.52,1.00,1)),
      arms:[-Math.sin(phase)*.28*walk,Math.sin(phase)*.28*walk],
      lean:work*(entity.role==='agricultor'?-.15:-.045),
      elbows:[.10+work*.35,.15+work*(entity.role==='administrador'?.85:.60)],
      tool:Math.sin(time*(entity.role==='agricultor'?2.4:3.0))*.13*work
    };
  }
  const motion=Object.freeze({blend,horse,worker,legPose,horseForm,workerForm,workerLook,volume});
  if(typeof module!=='undefined'&&module.exports)module.exports=motion;
  else window.FazendaVivaMotion=motion;
})();
