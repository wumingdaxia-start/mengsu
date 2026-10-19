/* Mengsu star letter: a procedural double-star spiral, drawn at display density. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  // Shared camera geometry for dust, bright stars and the Canvas fallback.
  const CAMERA = { yaw:.56, pitch:.44, shiftX:.24, shiftY:.18, perspective:.30, response:6 };
  function project(x,y,z,tilt) {
    const yaw=tilt.x*CAMERA.yaw,pitch=-tilt.y*CAMERA.pitch;
    const xx=x*Math.cos(yaw)+z*Math.sin(yaw),zz=-x*Math.sin(yaw)+z*Math.cos(yaw);
    const yy=y*Math.cos(pitch)-zz*Math.sin(pitch),depth=y*Math.sin(pitch)+zz*Math.cos(pitch);
    const scale=1/(1-depth*CAMERA.perspective);
    return {x:xx*scale+tilt.x*CAMERA.shiftX,y:yy*scale+tilt.y*CAMERA.shiftY,scale};
  }
  function random(seed) { return () => { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }; }
  function particles() {
    const rand=random(271828), out=[];
    const normal=()=>Math.sqrt(-2*Math.log(Math.max(.00001,rand())))*Math.cos(TAU*rand());
    for(let i=0;i<12500;i++) {
      let radius,angle,z,size,alpha;
      if(i<3500) {
        radius=.13+Math.pow(rand(),.8)*.23;
        angle=rand()*TAU;
        radius+=normal()*.014;
        z=normal()*.025;size=.48+rand()*.64;alpha=.25+rand()*.50;
      } else if(i<11200) {
        radius=.28+Math.pow(rand(),.8)*.92;
        angle=(i%3)*TAU/3+radius*5.6+normal()*(.075+radius*.07);
        radius+=normal()*.018;
        z=normal()*.045;size=.42+rand()*.75;alpha=.13+rand()*.48;
      } else {
        radius=Math.sqrt(rand())*1.8;angle=rand()*TAU;z=normal()*.15;
        size=.42+rand()*.85;alpha=.12+rand()*.3;
      }
      out.push(radius,angle,z,size,alpha,rand()*TAU);
    }
    return new Float32Array(out);
  }
  const VERT=`
    precision highp float;
    attribute vec4 aOrbit;
    attribute vec2 aLight;
    uniform vec2 uViewport,uCenter,uTilt;
    uniform float uRadius,uTime,uDpr;
    varying float vAlpha;
    void main(){
      float r=aOrbit.x;
      float angle=aOrbit.y+uTime*(.012+.008/(r+.3));
      vec3 p=vec3(cos(angle)*r,sin(angle)*r*.94,aOrbit.z);
      float yaw=uTilt.x*${CAMERA.yaw},pitch=-uTilt.y*${CAMERA.pitch};
      p.xz=mat2(cos(yaw),-sin(yaw),sin(yaw),cos(yaw))*p.xz;
      p.yz=mat2(cos(pitch),sin(pitch),-sin(pitch),cos(pitch))*p.yz;
      float perspective=1./(1.-p.z*${CAMERA.perspective});
      vec2 pixel=uCenter+(p.xy*perspective+uTilt*vec2(${CAMERA.shiftX},${CAMERA.shiftY}))*uRadius;
      gl_Position=vec4(pixel.x/uViewport.x*2.-1.,1.-pixel.y/uViewport.y*2.,0.,1.);
      gl_PointSize=max(1.,aOrbit.w*uDpr*(uRadius/420.+.35)*1.4);
      float pulse=.84+.16*sin(aLight.y+uTime*.65);
      float top=smoothstep(70.,140.,pixel.y);
      vAlpha=aLight.x*pulse*top;
    }`;
  const FRAG=`
    precision mediump float;
    varying float vAlpha;
    void main(){
      float d=length(gl_PointCoord-.5)*2.;
      float alpha=(1.-smoothstep(.12,1.,d))*vAlpha;
      gl_FragColor=vec4(.89,.91,1.,alpha);
    }`;
  function gpu(canvas,points) {
    const gl=canvas.getContext('webgl',{antialias:false,alpha:false,powerPreference:'low-power'});
    if(!gl) return null;
    const shaders=[],buffers=[];let program,lost=false;
    try {
      for(const [type,source] of [[gl.VERTEX_SHADER,VERT],[gl.FRAGMENT_SHADER,FRAG]]) {
        const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error('Star shader unavailable');
      }
      program=gl.createProgram();shaders.forEach(s=>gl.attachShader(program,s));gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('Star renderer unavailable');
      gl.useProgram(program);const buffer=gl.createBuffer();buffers.push(buffer);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,points,gl.STATIC_DRAW);
      for(const [name,size,offset] of [['aOrbit',4,0],['aLight',2,16]]) {
        const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,24,offset);
      }
    } catch(error) { buffers.forEach(b=>gl.deleteBuffer(b));if(program)gl.deleteProgram(program);throw error; }
    finally {shaders.forEach(s=>gl.deleteShader(s));}
    const uniforms={};['uViewport','uCenter','uTilt','uRadius','uTime','uDpr'].forEach(n=>uniforms[n]=gl.getUniformLocation(program,n));
    gl.clearColor(3/255,3/255,8/255,1);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
    const onLost=e=>{e.preventDefault();lost=true;};canvas.addEventListener('webglcontextlost',onLost);
    return {
      get lost(){return lost;},
      resize(w,h,dpr){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);gl.viewport(0,0,canvas.width,canvas.height);},
      draw(w,h,cx,cy,r,t,tilt,dpr){
        if(lost)return;gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);
        gl.uniform2f(uniforms.uViewport,w,h);gl.uniform2f(uniforms.uCenter,cx,cy);gl.uniform2f(uniforms.uTilt,tilt.x,tilt.y);
        gl.uniform1f(uniforms.uRadius,r);gl.uniform1f(uniforms.uTime,t);gl.uniform1f(uniforms.uDpr,dpr);
        gl.drawArrays(gl.POINTS,0,points.length/6);
      },
      dispose(){canvas.removeEventListener('webglcontextlost',onLost);buffers.forEach(b=>gl.deleteBuffer(b));gl.deleteProgram(program);}
    };
  }
  function cpu(canvas,points) {
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
    return {
      resize(w,h,dpr){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);},
      draw(w,h,cx,cy,r,t,tilt){
        ctx.globalAlpha=1;ctx.fillStyle='#030308';ctx.fillRect(0,0,w,h);ctx.fillStyle='#e3e8ff';
        for(let i=0;i<points.length;i+=12) {
          const radius=points[i],a=points[i+1]+t*(.012+.008/(radius+.3)),z=points[i+2];
          const p=project(Math.cos(a)*radius,Math.sin(a)*radius*.94,z,tilt);
          const x=cx+p.x*r,y=cy+p.y*r;
          ctx.globalAlpha=points[i+4]*(.84+.16*Math.sin(points[i+5]+t*.65))*clamp((y-70)/70,0,1);
          const s=Math.max(.6,points[i+3]*r/420);ctx.fillRect(x,y,s,s);
        }ctx.globalAlpha=1;
      },dispose(){}
    };
  }
  function create(canvas,overlay) {
    const points=particles(),ctx=overlay.getContext('2d');if(!ctx)return null;
    let painter;try{painter=gpu(canvas,points);}catch{}
    function fallback(){if(painter)painter.dispose();const next=canvas.cloneNode(false);canvas.replaceWith(next);canvas=next;painter=cpu(canvas,points);}
    if(!painter)fallback();
    let w=1,h=1,dpr=1,active=false,disposed=false,clock=0;
    const tilt={x:0,y:0},target={x:0,y:0},rand=random(142857),lights=[];
    const trail=[],sparks=[],cursor={x:0,y:0,active:false,lastMove:-10};
    const TRAIL_LIFE=1.35,TRAIL_LENGTH=560;
    function resetPointer(){trail.length=0;sparks.length=0;cursor.active=false;target.x=target.y=0;}
    for(let i=0;i<55;i++)lights.push({r:.37+rand()*.96,a:rand()*TAU,s:.7+rand()*1.4,p:rand()*TAU});
    function resize(width,height){w=width;h=height;resetPointer();dpr=Math.min(canvas.ownerDocument.defaultView.devicePixelRatio||1,2);painter.resize(w,h,dpr);overlay.width=Math.round(w*dpr);overlay.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
    function glow(x,y,r,color,alpha=1){
      ctx.globalAlpha=alpha;const g=ctx.createRadialGradient(x,y,0,x,y,r*5);
      g.addColorStop(0,'#ffffff');g.addColorStop(.09,color);g.addColorStop(.23,color+'bd');g.addColorStop(.5,color+'20');g.addColorStop(1,color+'00');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*5,0,TAU);ctx.fill();
    }
    function move(x,y,showTrail=true){
      target.x=clamp((x/w*2-1)*1.3,-1,1);target.y=clamp((y/h*2-1)*1.3,-1,1);
      if(!showTrail){trail.length=0;sparks.length=0;cursor.active=false;return;}
      const last=trail[trail.length-1];
      if(last&&Math.hypot(x-last.x,y-last.y)<2)return;
      const distance=last?Math.hypot(x-last.x,y-last.y):0;
      if(last&&clock-last.t>.22)trail.length=0;
      cursor.x=x;cursor.y=y;cursor.active=true;cursor.lastMove=clock;
      const start=trail[trail.length-1],steps=start?Math.min(24,Math.max(1,Math.ceil(distance/8))):1;
      for(let i=1;i<=steps;i++){
        const q=i/steps;trail.push({x:start?start.x+(x-start.x)*q:x,y:start?start.y+(y-start.y)*q:y,t:clock});
      }
      if(trail.length>160)trail.splice(0,trail.length-160);
      if(distance>6){
        const n=Math.min(5,Math.ceil(distance/14));
        for(let i=0;i<n;i++){const angle=rand()*TAU,speed=12+rand()*28;sparks.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,t:clock,size:.6+rand()*1.4});}
        if(sparks.length>96)sparks.splice(0,sparks.length-96);
      }
    }
    function drawComet(dt){
      while(trail.length&&clock-trail[0].t>TRAIL_LIFE)trail.shift();
      let length=0;
      for(let i=trail.length-1;i>0;i--){length+=Math.hypot(trail[i].x-trail[i-1].x,trail[i].y-trail[i-1].y);if(length>TRAIL_LENGTH){trail.splice(0,i);break;}}
      ctx.lineCap='round';ctx.lineJoin='round';
      for(let i=1;i<trail.length;i++){
        const a=trail[i-1],b=trail[i],fade=Math.pow(clamp(1-(clock-b.t)/TRAIL_LIFE,0,1),1.5);
        const taper=i/trail.length;
        for(const [width,color,opacity] of [[13,'#8bbfff',.075],[5,'#b9dbff',.25],[1.6,'#f2f8ff',.92]]){
          ctx.globalAlpha=fade*taper*opacity;ctx.strokeStyle=color;ctx.lineWidth=Math.max(.2,width*taper);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
        }
      }
      for(let i=sparks.length-1;i>=0;i--){
        const s=sparks[i],age=clock-s.t;if(age>1){sparks.splice(i,1);continue;}
        s.x+=s.vx*dt;s.y+=s.vy*dt;glow(s.x,s.y,s.size,'#b3d6ff',Math.pow(1-age,2)*.65);
      }
      const head=clamp(1-(clock-cursor.lastMove)/.8,0,1);
      if(cursor.active&&head>0){
        glow(cursor.x,cursor.y,3.8,'#c5e5ff',head);ctx.globalAlpha=head*.85;ctx.strokeStyle='#f3faff';ctx.lineWidth=.8;
        ctx.beginPath();ctx.moveTo(cursor.x-9,cursor.y);ctx.lineTo(cursor.x+9,cursor.y);ctx.moveTo(cursor.x,cursor.y-9);ctx.lineTo(cursor.x,cursor.y+9);ctx.stroke();
      }
    }
    function render(dt){
      if(!active||disposed)return;clock+=dt;const t=clock;
      if(dt===0)resetPointer();
      if(painter.lost){fallback();painter.resize(w,h,dpr);}
      const smoothing=dt>0?1-Math.exp(-dt*CAMERA.response):0;tilt.x+=(target.x-tilt.x)*smoothing;tilt.y+=(target.y-tilt.y)*smoothing;
      const r=Math.min(w*.49,h*.41),cx=w*.5,cy=h*.54;
      painter.draw(w,h,cx,cy,r,t,tilt,dpr);ctx.clearRect(0,0,w,h);ctx.globalCompositeOperation='lighter';
      for(const f of lights){
        const a=f.a+t*.014,p=project(Math.cos(a)*f.r,Math.sin(a)*f.r*.94,Math.sin(f.p)*.08,tilt),x=cx+p.x*r,y=cy+p.y*r;
        const alpha=(.38+.28*Math.sin(t*.6+f.p)**2)*clamp((y-100)/60,0,1);
        glow(x,y,f.s*Math.max(.6,r/420),'#e3eaff',alpha);
      }
      // A blue-white and a warm gold star orbit a shared, empty centre.
      const orbit=.205*r,a=2.90+t*.19;
      for(const [offset,color] of [[0,'#89caff'],[Math.PI,'#fff36f']]){
        const angle=a+offset;
        const p=project(Math.cos(angle)*orbit/r,Math.sin(angle)*orbit/r*.68,0,tilt),x=cx+p.x*r,y=cy+p.y*r;
        glow(x,y,Math.max(3,r*.018),color);
        ctx.globalAlpha=1;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,Math.max(2,r*.012),0,TAU);ctx.fill();
      }
      // Sparse orbiting streaks; tapered trails remain part of the distant scene.
      for(let i=0;i<4;i++){
        const phase=(t*.055+i*.247)%1,angle=-1.1+i*1.7+phase*.38;
        const radius=(.79+Math.sin(i*2)*.22)*r;
        const p=project(Math.cos(angle)*radius/r,Math.sin(angle)*radius/r*.94,0,tilt),x=cx+p.x*r,y=cy+p.y*r;
        const dx=Math.cos(angle-.65),dy=Math.sin(angle-.65),length=r*(.16+.08*Math.sin(i+1));
        const alpha=Math.sin(phase*Math.PI)**2*.62*clamp((y-110)/60,0,1);
        const trail=ctx.createLinearGradient(x-dx*length,y-dy*length,x,y);trail.addColorStop(0,'#d7e7ff00');trail.addColorStop(1,'#d7e7ffac');
        ctx.globalAlpha=alpha;ctx.strokeStyle=trail;ctx.lineWidth=Math.max(.7,r*.0023);
        ctx.beginPath();ctx.moveTo(x-dx*length,y-dy*length);ctx.quadraticCurveTo(x-dx*length*.4-8,y-dy*length*.4,x,y);ctx.stroke();
        glow(x,y,Math.max(1.1,r*.005),'#e5eaff',alpha);
      }
      drawComet(dt);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    }
    resize(canvas.ownerDocument.defaultView.innerWidth,canvas.ownerDocument.defaultView.innerHeight);
    return {resize,render,resetPointer,setActive(value){active=value;if(!value)resetPointer();},move,leave(){target.x=target.y=0;cursor.active=false;},dispose(){disposed=true;resetPointer();painter.dispose();}};
  }
  window.MengsuStarGalaxy=Object.freeze({create});
})();
