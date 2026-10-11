/* Poses leves compartilhadas: os renderizadores interpretam a mesma animação.
 * Sem relógio próprio, aleatoriedade ou dependência de Three.js. */
(() => {
  'use strict';
  const TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  // Secções da mesma anatomia nos dois renderizadores: centro X/altura,
  // raio vertical e largura. Os anéis acompanham a curva de cada volume.
  const horseForm=Object.freeze({
    body:[[-2.06,2.28,.32,.40],[-1.56,2.34,.70,.73],[-.94,2.30,.78,.73],
      [0,2.31,.69,.64],[.73,2.42,.73,.62],[1.24,2.31,.68,.55],[1.52,2.17,.33,.37]],
    neck:[[0,-.22,.43,.42],[.28,.31,.46,.36],[.58,.87,.35,.28],[.97,1.38,.23,.23]],
    head:[[-.12,.13,.24,.25],[.26,.13,.35,.30],[.62,-.08,.29,.26],[.98,-.31,.21,.23],[1.23,-.36,.17,.22]],
    mane:[[-.25,-.16,.14,.12],[-.12,.48,.14,.13],[.27,1.03,.12,.12],[.64,1.43,.10,.09]],
    tail:[[0,0,.18,.19],[-.22,-.63,.17,.20],[-.40,-1.20,.13,.16],[-.30,-1.68,.04,.08]]
  });
  function volume(rings,sides=8){
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
      tool:Math.sin(time*(entity.role==='agricultor'?2.4:3.0))*.13*work
    };
  }
  const motion=Object.freeze({blend,horse,worker,legPose,horseForm,volume});
  if(typeof module!=='undefined'&&module.exports)module.exports=motion;
  else window.FazendaVivaMotion=motion;
})();
