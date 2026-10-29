/* Reference-inspired underwater school: lightweight Canvas with independently flexing silver fish. */
(() => {
'use strict';
function create(canvas){
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return null;
 const sprite=new Image();sprite.src=new URL('assets/silver-fish.png',document.baseURI).href;
 let w=1,h=1,dpr=1,active=false,disposed=false,seed=47;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const fish=Array.from({length:matchMedia('(max-width:720px)').matches?56:104},()=>({angle:random()*Math.PI*2,radius:.53+random()*.79,depth:random(),phase:random()*6.28,speed:.025+random()*.045,size:.65+random()*.8,ox:0,oy:0})).sort((a,b)=>a.depth-b.depth);
 const dust=Array.from({length:50},()=>({x:random(),y:random(),r:.4+random()*1.4,phase:random()*6.28}));
 const pointer={x:0,y:0,active:false};
 function resize(width,height){w=width;h=height;dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 function drawFish(x,y,length,heading,phase,opacity){
  if(!sprite.complete||!sprite.naturalWidth)return;
  ctx.save();ctx.translate(x,y);ctx.rotate(heading);ctx.globalAlpha=opacity;
  const sw=sprite.naturalWidth,sh=sprite.naturalHeight,scale=length/sw;
  // Travelling body bend increases toward the forked tail; strip overlap avoids seams.
  for(let k=0;k<22;k++){const u=k/22,part=sw/22,bend=Math.sin(phase-u*4.2)*(1-u)**2*length*.048;
   ctx.drawImage(sprite,u*sw,0,part+.7,sh,(u-.5)*length,-sh*scale*.54+bend,part*scale+.6,sh*scale);
  }ctx.restore();
 }
 function render(dt,t){
  if(!active||disposed)return;ctx.setTransform(dpr,0,0,dpr,0,0);
  const base=ctx.createRadialGradient(w*.57,-h*.1,0,w*.53,h*.3,Math.max(w,h)*.86);
  base.addColorStop(0,'#e1f8ff');base.addColorStop(.24,'#75c8e8');base.addColorStop(.55,'#237fae');base.addColorStop(1,'#07355e');
  ctx.fillStyle=base;ctx.fillRect(0,0,w,h);
  ctx.save();ctx.globalCompositeOperation='screen';
  for(let i=0;i<9;i++){const origin=w*(.38+i*.032),drift=Math.sin(t*.09+i)*w*.035;
   const beam=ctx.createLinearGradient(origin,0,origin+drift,h);beam.addColorStop(0,'rgba(218,250,255,.17)');beam.addColorStop(.8,'rgba(157,224,250,0)');
   ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(origin,0);ctx.lineTo(origin+w*.018,0);ctx.lineTo(origin+drift+w*.15,h);ctx.lineTo(origin+drift-w*.11,h);ctx.fill();
  }ctx.restore();
  for(const f of fish){
   const a=f.angle+t*f.speed,r=f.radius+.035*Math.sin(t*.19+f.phase);
   let x=w*.51+Math.cos(a)*w*.47*r,y=h*.47+Math.sin(a)*h*.53*r;
   const dx=x-pointer.x,dy=y-pointer.y,dist=Math.hypot(dx,dy),reach=Math.min(w,h)*.16;
   const push=pointer.active?Math.max(0,1-dist/reach)*32:0,blend=dt>0?1-Math.exp(-dt*2):0;
   f.ox+=(dx/Math.max(1,dist)*push-f.ox)*blend;f.oy+=(dy/Math.max(1,dist)*push-f.oy)*blend;
   const heading=Math.atan2(Math.cos(a)*h*.53,-Math.sin(a)*w*.47);
   drawFish(x+f.ox,y+f.oy,Math.min(w,h)*(.018+f.depth*.15)*f.size,heading,t*(3+f.speed*22)+f.phase,.18+f.depth*.8);
  }
  ctx.save();ctx.globalCompositeOperation='screen';
  for(const p of dust){const x=(p.x*w+Math.sin(t*.07+p.phase)*18+w)%w,y=((p.y-t*.006)*h%h+h)%h;
   ctx.globalAlpha=.13+.2*(.5+.5*Math.sin(t*.5+p.phase));ctx.fillStyle='#e0faff';ctx.beginPath();ctx.arc(x,y,p.r,0,Math.PI*2);ctx.fill();
  }ctx.restore();
  const shade=ctx.createRadialGradient(w*.5,h*.5,0,w*.5,h*.5,Math.max(w,h)*.68);
  shade.addColorStop(0,'rgba(3,38,67,.12)');shade.addColorStop(.55,'rgba(2,31,58,0)');shade.addColorStop(1,'rgba(1,25,49,.44)');
  ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
 }
 resize(innerWidth,innerHeight);
 return {resize,render,move(x,y){pointer.x=x;pointer.y=y;pointer.active=true;},leave(){pointer.active=false;},setActive(v){active=v;},dispose(){disposed=true;sprite.src='';}};
}
window.MengsuMoonSchool=Object.freeze({create});
})();
