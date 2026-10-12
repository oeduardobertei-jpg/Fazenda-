/* Solo e vegetação baixa compartilhados. Não consome o RNG da simulação. */
(()=>{
 'use strict';
 const hash=n=>{const v=Math.sin(n*73.619+12.7)*43758.545;return v-Math.floor(v)};
 const mix=(a,b,t)=>[16,8,0].reduce((c,s)=>c|(Math.round(((a>>s)&255)*(1-t)+((b>>s)&255)*t)<<s),0);
 const distance=(x,y,t)=>{
  const dx=t.x2-t.x1,dy=t.y2-t.y1,d=dx*dx+dy*dy||1;
  const u=Math.max(0,Math.min(1,((x-t.x1)*dx+(y-t.y1)*dy)/d));
  return Math.hypot(x-t.x1-u*dx,y-t.y1-u*dy);
 };
 function contour(a){
  if(a.outline)return a.outline;
  return Array.from({length:16},(_,i)=>{
   const t=i*Math.PI/8,r=.84+hash(a.seed+i*19)*.16,
    x=Math.cos(t)*a.rx*r,y=Math.sin(t)*a.ry*r,c=Math.cos(a.angle||0),s=Math.sin(a.angle||0);
   return {x:a.x+x*c-y*s,y:a.y+x*s+y*c};
  });
 }
 function rectangle(x,y,w,h){
  const corners=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]];
  return corners.map(p=>({x:x+p[0],y:y+p[1]}));
 }
 function generate({owners=[],buildings=[],trails=[],ponds=[]}){
  const areas=[],sprigs=[];
  for(let i=0;i<40;i++){
   const seed=31000+i*37;
   areas.push({x:hash(seed)*2600-1300,y:hash(seed+3)*2400-1200,rx:24+hash(seed+5)*42,
    ry:18+hash(seed+7)*31,angle:hash(seed+9)*Math.PI,seed,layer:'outside',base:0x89a970,
    color:mix(0x89a970,i%3?0x729653:0xa1b77b,.22),elevation:.10});
  }
  const clear=(o,x,y,margin=.8)=>
   !buildings.some(b=>b.o===o&&Math.abs(x-b.x)<b.w/2+margin&&Math.abs(y-b.y)<b.h/2+margin)&&
   !trails.some(t=>distance(x,y,t)<(t.w||2.5)/2+margin)&&
   !ponds.some(p=>((x-p.x)/(p.rx+margin))**2+((y-p.y)/(p.ry+margin))**2<1.05);
  owners.forEach((o,k)=>{
   const base=o.style?.ground??0xa6b98a,leaf=o.style?.leaf??0x607e4a;
   for(let i=0;i<20;i++){
    const seed=k*317+i*29,t=hash(seed)*Math.PI*2,r=Math.sqrt(hash(seed+5))*69;
    areas.push({x:o.x+Math.cos(t)*r,y:o.y+Math.sin(t)*r,rx:12+hash(seed+7)*18,
     ry:8+hash(seed+9)*13,angle:hash(seed+11)*Math.PI,seed,layer:'field',base,
     color:mix(base,i%3===0?0xb9b07b:leaf,i%3===0?.23:.18),elevation:.263});
   }
   // Parcelas visuais de pastagem/feno. Não criam lavouras ou obstáculos.
   // Rejeitar o retângulo inteiro mantém água, construções e caminhos livres.
   for(let row=-2;row<=2;row++)for(let col=-2;col<=2;col++){
    const seed=41000+k*619+(row+2)*37+(col+2)*71,
     x=o.x+col*40,y=o.y+row*40,w=34+hash(seed)*2,h=32+hash(seed+1)*3;
    const outline=rectangle(x,y,w,h);
    if(outline.some(p=>Math.hypot(p.x-o.x,p.y-o.y)>116))continue;
    if(buildings.some(b=>b.o===o&&Math.abs(x-b.x)<w/2+b.w/2+4&&Math.abs(y-b.y)<h/2+b.h/2+4))continue;
    if(ponds.some(p=>Math.abs(x-p.x)<w/2+p.rx+3&&Math.abs(y-p.y)<h/2+p.ry+3))continue;
    const crosses=trails.some(t=>{
     // Clip do segmento contra retângulo expandido pela margem do caminho.
     const m=(t.w||2.5)/2+2,dx=t.x2-t.x1,dy=t.y2-t.y1;
     let lo=0,hi=1;
     for(const [origin,delta,min,max] of [[t.x1,dx,x-w/2-m,x+w/2+m],[t.y1,dy,y-h/2-m,y+h/2+m]]){
      if(Math.abs(delta)<1e-9){if(origin<min||origin>max)return false}
      else{const a=(min-origin)/delta,b=(max-origin)/delta;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));if(lo>hi)return false}
     }
     return true;
    });
    if(crosses)continue;
    const dry=hash(seed+7)>.67,color=dry?mix(base,0xc6b36c,.58):mix(base,leaf,.24+hash(seed+3)*.18);
    areas.push({x,y,rx:w/2,ry:h/2,angle:0,seed,layer:'sector',owner:o,base:color,color,
     elevation:.269,outline,sector:true,dry});
    const horizontal=(col+row+k)%2===0,count=8;
    for(let i=0;i<count;i++){
     const px=horizontal?x:x-w*.42+i*w*.12,py=horizontal?y-h*.42+i*h*.12:y,
      rw=horizontal?w-2:.38,rh=horizontal?.38:h-2,stripe=mix(color,dry?0x8e945d:0xd0ca92,.12);
     areas.push({x:px,y:py,rx:rw/2,ry:rh/2,angle:0,seed:seed+i,layer:'sector',owner:o,
      base:stripe,color:stripe,elevation:.270,outline:rectangle(px,py,rw,rh),stripe:true});
    }
   }
   for(let i=0;i<95;i++){
    const seed=k*811+i*13,cluster=Math.floor(i/12),t=hash(k*97+cluster*41)*Math.PI*2,
     r=65+hash(k*103+cluster*43)*40,spread=4+hash(seed+19)*7,
     x=o.x+Math.cos(t)*r+Math.cos(seed)*spread,y=o.y+Math.sin(t)*r+Math.sin(seed)*spread;
    if(clear(o,x,y,1.3))sprigs.push({x,y,height:.18+hash(seed+1)*.22,scale:.65+hash(seed+3)*.55,
     angle:t,color:mix(leaf,base,.32),elevation:.27});
   }
  });
  trails.forEach((t,i)=>{
   const o=owners.find(o=>o.name===t.owner);if(!o)return;
   const dx=t.x2-t.x1,dy=t.y2-t.y1,len=Math.hypot(dx,dy);if(len<3)return;
   const base=o.style.ground,angle=Math.atan2(dy,dx),count=Math.min(7,Math.ceil(len/8));
   for(let j=0;j<count;j++)for(const side of [-1,1]){
    const seed=17000+i*83+j*7+side,u=(j+.5)/count,offset=(t.w||2.5)/2+.8,
     x=t.x1+dx*u-dy/len*offset*side,y=t.y1+dy*u+dx/len*offset*side;
    if(!clear(o,x,y,.15))continue;
    areas.push({x,y,rx:2.2+hash(seed)*1.8,ry:1.2,angle,seed,layer:'field',base,
     color:mix(base,0xb39870,.40),elevation:.268});
    if(clear(o,x,y,.65))sprigs.push({x,y,height:.22,scale:.8,angle,color:o.style.leaf,elevation:.27});
   }
  });
  buildings.forEach((b,k)=>{
   if(b.status==='building')return;
   const base=b.o.style?.ground??0xa6b98a,seed=23000+k*311;
   if(b.type==='paddock'){
    const variety=Math.abs(Math.round(b.x*17+b.y*23+((b.o.style?.roof||0)%17)))%5,
     penBase=variety%2?0x84ac65:0x79a35c;
    for(const [i,dx,dy,rx,ry] of [[0,0,-.17,.26,.27],[1,-.22,.18,.18,.15],[2,.27,.16,.15,.18]])
     areas.push({x:b.x+dx*b.w,y:b.y+dy*b.h,rx:b.w*rx,ry:b.h*ry,angle:0,seed:seed+i,
      layer:'pen',building:b,base:penBase,color:mix(penBase,0xb59a6b,.32),elevation:.399});
    for(let i=0;i<16;i++){
     const x=b.x+(hash(seed+i*13)-.5)*(b.w-4),y=b.y+(hash(seed+i*17+9)-.5)*(b.h-4);
     // Abrigo, cocho, água e corredor da porteira permanecem legíveis.
     if(Math.abs(x-b.x)<4&&y<b.y-b.h*.12||y>b.y+b.h*.15)continue;
     sprigs.push({x,y,height:.16,scale:.8,angle:hash(seed+i)*6.28,
      color:0x659044,elevation:.40,building:b});
    }
   }else{
    for(const side of [-1,1]){
     const x=b.x+side*(b.w/2+1.2),y=b.y+b.h*.17;
     if(clear(b.o,x,y,.3))areas.push({x,y,rx:2.8,ry:b.h*.40,angle:0,seed:seed+side,
      layer:'field',base,color:mix(base,0xb39a73,.48),elevation:.267});
     for(let i=0;i<8;i++){
      const xx=b.x+side*(b.w/2+2),yy=b.y+(i/7-.5)*b.h*.9;
      if(clear(b.o,xx,yy,.9))sprigs.push({x:xx,y:yy,height:.24,scale:1.1,
       angle:i*2.4,color:b.o.style.leaf,elevation:.27});
     }
    }
   }
  });
  areas.forEach(a=>a.outline=contour(a));
  return {areas,sprigs};
 }
 let pixels;
 function grain(){
  if(pixels)return pixels;
  pixels=new Uint8Array(128*128*4);
  for(let i=0;i<128*128;i++){
   const v=Math.round(238+17*(hash(i)+hash(Math.floor(i%128/4)+Math.floor(i/512)*31))*.5);
   pixels.set([v,v,v,255],i*4);
  }
  return pixels;
 }
 const api=Object.freeze({generate,contour,grain,tileSize:24});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.FazendaVivaTerrain=api;
})();
