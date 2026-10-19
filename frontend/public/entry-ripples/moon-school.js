/* Mengsu moon school. Procedural fish geometry; no reference image is embedded. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function random(seed) {
    return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  }

  function geometry() {
    const vertices = [], normals = [], opacity = [];
    function triangle(a, b, c, na, nb, nc, alpha = 1) {
      vertices.push(...a, ...b, ...c); normals.push(...na, ...nb, ...nc); opacity.push(alpha, alpha, alpha);
    }
    const rings = [[-.64,.016],[-.51,.038],[-.36,.085],[-.19,.155],[.02,.23],[.21,.275],[.38,.268],[.51,.223],[.60,.15],[.65,.072],[.665,.005]];
    const sides = 24;
    function point(i, j) {
      const [x, r] = rings[i], a = j / sides * TAU;
      return [x, Math.cos(a) * r, Math.sin(a) * r * .58];
    }
    function normal(i, j) {
      const prev = rings[Math.max(0, i - 1)], next = rings[Math.min(rings.length - 1, i + 1)];
      const slope = (next[1] - prev[1]) / (next[0] - prev[0]);
      const a = j / sides * TAU, n = [-slope, Math.cos(a), Math.sin(a) / .58];
      const length = Math.hypot(...n);
      return n.map(x => x / length);
    }
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < sides; j++) {
      triangle(point(i,j), point(i+1,j), point(i,j+1), normal(i,j), normal(i+1,j), normal(i,j+1));
      triangle(point(i+1,j), point(i+1,j+1), point(i,j+1), normal(i+1,j), normal(i+1,j+1), normal(i,j+1));
    }
    // Forked caudal fin, pectoral fins and a low dorsal ridge.
    const up = [0,0,1];
    const tail = [[-.61,0,0],[-.76,.035,0],[-.86,.115,.003],[-1.04,.19,.006],[-.97,.085,0],[-.90,0,0],[-.97,-.085,0],[-1.04,-.19,.006],[-.86,-.115,.003],[-.76,-.035,0]];
    for (let i = 1; i < tail.length - 1; i++) triangle(tail[0],tail[i],tail[i+1],up,up,up,.72);
    for (const sign of [-1,1]) {
      triangle([.12,sign*.23,-.018],[-.15,sign*.34,-.025],[-.08,sign*.17,-.02],up,up,up,.54);
    }
    triangle([.12,0,.11],[-.22,.012,.19],[-.4,0,.04],[0,1,.4],[0,1,.4],[0,1,.4],.45);
    return { positions:new Float32Array(vertices), normals:new Float32Array(normals), alpha:new Float32Array(opacity), count:opacity.length };
  }

  const vertexSource = `
    precision highp float;
    attribute vec3 aPosition, aNormal;
    attribute float aAlpha;
    attribute vec4 aPlace, aMotion, aColor;
    uniform vec2 uResolution;
    uniform float uTime;
    varying vec3 vNormal, vColor;
    varying float vAlpha, vDepth;
    void main() {
      vec3 p = aPosition;
      float flex = clamp((.19-p.x)/1.19,0.,1.);
      float phase = uTime*aMotion.z+aMotion.y;
      p.y += sin(phase-p.x*3.2)*flex*flex*.155;
      p.z += sin(phase-p.x*2.)*flex*.015;
      float roll = sin(phase*.36)*.12;
      mat2 bank = mat2(cos(roll),-sin(roll),sin(roll),cos(roll));
      p.yz = bank*p.yz;
      vec3 n = aNormal; n.yz = bank*n.yz;
      float c = cos(aMotion.x), s = sin(aMotion.x);
      mat2 turn = mat2(c,s,-s,c);
      p.xy = turn*p.xy;
      n.xy = turn*n.xy;
      vec2 pixel = aPlace.xy+p.xy*aPlace.w;
      gl_Position = vec4(pixel.x/uResolution.x*2.-1., 1.-pixel.y/uResolution.y*2., -.8*aPlace.z-p.z*.02, 1.);
      vNormal = vec3(n.x,-n.y,n.z);
      vColor = aColor.rgb;
      vDepth = aPlace.z;
      vAlpha = aAlpha*aMotion.w;
    }
  `;
  const fragmentSource = `
    precision mediump float;
    varying vec3 vNormal, vColor;
    varying float vAlpha, vDepth;
    void main() {
      vec3 n = normalize(vNormal);
      vec3 light = normalize(vec3(-.4,.5,1.));
      float diffuse = max(0.,dot(n,light));
      float sheen = pow(max(0.,dot(n,normalize(vec3(-.3,.3,1.)))),15.);
      vec3 color = vColor*(.80+.22*diffuse)+vec3(.06,.10,.13)*sheen;
      color = mix(vec3(.897,.913,.955),color,.11+.89*vDepth);
      gl_FragColor = vec4(color,vAlpha);
    }
  `;

  function webglRenderer(canvas) {
    const gl = canvas.getContext('webgl',{antialias:true,alpha:false,powerPreference:'low-power'});
    if (!gl) return null;
    const ext = gl.getExtension('ANGLE_instanced_arrays');
    const buffers = [];
    function compile(type, source) {
      const shader = gl.createShader(type); gl.shaderSource(shader,source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) { gl.deleteShader(shader); throw new Error('Fish shader unavailable'); }
      return shader;
    }
    const vs = compile(gl.VERTEX_SHADER,vertexSource), fs = compile(gl.FRAGMENT_SHADER,fragmentSource);
    const program = gl.createProgram(); gl.attachShader(program,vs); gl.attachShader(program,fs); gl.linkProgram(program);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error('Fish renderer unavailable');
    gl.useProgram(program);
    const shape = geometry();
    function attribute(name,data,size) {
      const buffer=gl.createBuffer(); buffers.push(buffer); gl.bindBuffer(gl.ARRAY_BUFFER,buffer); gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
      const location=gl.getAttribLocation(program,name); gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location,size,gl.FLOAT,false,0,0);
    }
    attribute('aPosition',shape.positions,3); attribute('aNormal',shape.normals,3); attribute('aAlpha',shape.alpha,1);
    const instanceBuffer = gl.createBuffer(); buffers.push(instanceBuffer);
    const locations = ['aPlace','aMotion','aColor'].map(name=>gl.getAttribLocation(program,name));
    const resolution = gl.getUniformLocation(program,'uResolution'), time = gl.getUniformLocation(program,'uTime');
    gl.clearColor(.897,.913,.955,1); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
    let lost = false;
    const contextLost=event=>{event.preventDefault();lost=true;};
    canvas.addEventListener('webglcontextlost', contextLost);
    return {
      get lost() {return lost;},
      resize(width,height,dpr) { canvas.width=Math.round(width*dpr); canvas.height=Math.round(height*dpr); gl.viewport(0,0,canvas.width,canvas.height); },
      draw(data,count,width,height,t) {
        if (lost) return;
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT); gl.useProgram(program); gl.uniform2f(resolution,width,height); gl.uniform1f(time,t);
        if (ext) {
          gl.bindBuffer(gl.ARRAY_BUFFER,instanceBuffer); gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);
          locations.forEach((location,i)=>{gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,4,gl.FLOAT,false,48,i*16);ext.vertexAttribDivisorANGLE(location,1);});
          ext.drawArraysInstancedANGLE(gl.TRIANGLES,0,shape.count,count);
        } else {
          locations.forEach(location=>gl.disableVertexAttribArray(location));
          for (let i=0;i<count;i++) {locations.forEach((location,j)=>gl.vertexAttrib4fv(location,data.subarray(i*12+j*4,i*12+j*4+4)));gl.drawArrays(gl.TRIANGLES,0,shape.count);}
        }
      },
      dispose() {canvas.removeEventListener('webglcontextlost',contextLost);buffers.forEach(buffer=>gl.deleteBuffer(buffer)); gl.deleteProgram(program); }
    };
  }

  function staticRenderer(canvas) {
    const ctx=canvas.getContext('2d');
    return {
      resize(w,h,dpr) {canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx?.setTransform(dpr,0,0,dpr,0,0);},
      draw(data,count,w,h) {
        if (!ctx) return;
        ctx.fillStyle='#e5e9f4';ctx.fillRect(0,0,w,h);
        for(let i=0;i<count;i++) {
          const o=i*12;ctx.save();ctx.translate(data[o],data[o+1]);ctx.rotate(data[o+4]);ctx.scale(data[o+3],data[o+3]);
          ctx.globalAlpha=.3+data[o+2]*.7;ctx.fillStyle=`rgb(${data[o+8]*255},${data[o+9]*255},${data[o+10]*255})`;
          ctx.beginPath();ctx.ellipse(.08,0,.55,.19,0,0,TAU);ctx.fill();
          ctx.beginPath();ctx.moveTo(-.4,0);ctx.lineTo(-1,.25);ctx.lineTo(-.86,0);ctx.lineTo(-1,-.25);ctx.closePath();ctx.fill();ctx.restore();
        }
      },dispose() {}
    };
  }

  function create(canvas) {
    let painter;
    try {painter=webglRenderer(canvas);} catch { /* A static sibling remains available if shader compilation fails. */ }
    if (!painter) {
      const fallback=canvas.cloneNode(false);canvas.replaceWith(fallback);canvas=fallback;
      painter=staticRenderer(canvas);
    }
    const rng=random(190517), fish=[], count=240;
    for(let i=0;i<count;i++) {
      const depth=.12+rng()*.88;
      fish.push({angle:i/count*TAU+rng()*.19,radius:.78+rng()*.55,depth,phase:rng()*TAU,speed:.025+rng()*.020,
        size:.7+rng()*.5,shade:rng(),x:0,y:0,heading:0,placed:false,ox:0,oy:0});
    }
    fish.sort((a,b)=>a.depth-b.depth);
    const data=new Float32Array((count+1)*12);
    let width=1,height=1,headerBottom=80,active=false,disposed=false,redHeading=-2.35;
    const pointer={x:0,y:0,active:false,seen:false,heading:-2.35,previousX:0,previousY:0};
    function resize(w,h) {
      width=w;height=h;
      const doc=canvas.ownerDocument;
      headerBottom=Math.max(...['.mengsu-header','.mengsu-chapters','#mengsuEnter'].map(selector=>doc.querySelector(selector)?.getBoundingClientRect().bottom||0))+18;
      painter.resize(w,h,Math.min(canvas.ownerDocument.defaultView.devicePixelRatio||1,2));
      fish.forEach(item=>{item.placed=false;});
      if(!pointer.seen) {pointer.x=w*.50;pointer.y=h*.30;}
      else {pointer.x=clamp(pointer.x,0,w);pointer.y=clamp(pointer.y,0,h);}
    }
    function move(x,y) {
      const dx=x-pointer.previousX,dy=y-pointer.previousY;
      if(pointer.seen && Math.hypot(dx,dy)>1.2) pointer.heading=Math.atan2(dy,dx);
      else if(!pointer.seen) pointer.heading=redHeading;
      pointer.previousX=x;pointer.previousY=y;pointer.x=x;pointer.y=y;pointer.active=true;pointer.seen=true;
    }
    function render(dt,t) {
      if(!active||disposed) return;
      if(painter.lost) {
        painter.dispose();
        const fallback=canvas.cloneNode(false);canvas.replaceWith(fallback);canvas=fallback;
        painter=staticRenderer(canvas);
        painter.resize(width,height,Math.min(canvas.ownerDocument.defaultView.devicePixelRatio||1,2));
      }
      const unit=Math.min(width,height)*.079;
      // Keep the complete orbit below the navigation, including fins and avoidance.
      const top=headerBottom+unit*.65,bottom=height-unit*.65;
      const cx=width*.50,cy=(top+bottom)*.5;
      const rx=width*.46,ry=Math.max(24,(bottom-top)*.5/1.41);
      const lerp=dt>0?1-Math.exp(-dt*5):0;
      const influence=Math.min(width,height)*.15;
      for(let i=0;i<count;i++) {
        const f=fish[i],a=f.angle+t*f.speed;
        const radius=f.radius+.055*Math.sin(a*3+f.phase*.4)+.025*Math.sin(t*.16+f.phase);
        let x=cx+Math.cos(a)*rx*radius+Math.sin(a*2)*width*.03,y=cy+Math.sin(a)*ry*radius;
        // Far fish below the school fade into the same pale water as the reference.
        const depth=f.depth*(.30+.70*(1-Math.sin(a))*.5);
        const dx=x-pointer.x,dy=y-pointer.y,dist=Math.hypot(dx,dy);
        let ox=0,oy=0;
        if(pointer.active && dist<influence) {
          const pressure=(1-dist/influence)**2*influence*.85;
          ox=dx/Math.max(dist,1)*pressure;oy=dy/Math.max(dist,1)*pressure;
        }
        if(dt>0) {f.ox+=(ox-f.ox)*lerp;f.oy+=(oy-f.oy)*lerp;}
        x+=f.ox;y+=f.oy;
        const heading=Math.atan2(Math.cos(a)*ry,-Math.sin(a)*rx);
        const upperArc=Math.max(0,-Math.sin(a));
        const upperScale=1-.25*upperArc*upperArc*(3-2*upperArc);
        const fishSize=unit*f.size*(.72+depth*.67)*upperScale;
        const headroom=fishSize*(Math.abs(Math.sin(f.heading))*1.18+Math.abs(Math.cos(f.heading))*.40);
        y=Math.max(y,headerBottom+headroom);
        if(!f.placed) {f.x=x;f.y=y;f.heading=heading;f.placed=true;}
        if(dt>0) {
          const vx=x-f.x,vy=y-f.y;
          const aim=Math.hypot(vx,vy)>1?Math.atan2(vy,vx):heading;
          f.heading+=Math.atan2(Math.sin(aim-f.heading),Math.cos(aim-f.heading))*lerp;
          f.x+=(x-f.x)*lerp;f.y+=(y-f.y)*lerp;
        }
        const o=i*12;
        f.y=Math.max(f.y,headerBottom+headroom);
        data.set([f.x,f.y,depth,fishSize,f.heading,f.phase,3.3+f.speed*25,1,
          .10+f.shade*.06,.43+f.shade*.11,.88+f.shade*.07,1],o);
      }
      if(dt>0) redHeading+=Math.atan2(Math.sin(pointer.heading-redHeading),Math.cos(pointer.heading-redHeading))*(1-Math.exp(-dt*13));
      const size=unit*.94,o=count*12;
      // The nose, rather than a separate browser arrow, sits at the actual pointer.
      const cursorVisible=pointer.y>headerBottom+size*1.7?1:0;
      data.set([pointer.x-Math.cos(redHeading)*.665*size,pointer.y-Math.sin(redHeading)*.665*size,1,size,redHeading,0,5.4,cursorVisible,.94,.22,.29,1],o);
      painter.draw(data,count+1,width,height,t);
    }
    resize(canvas.ownerDocument.defaultView.innerWidth,canvas.ownerDocument.defaultView.innerHeight);
    return {
      resize,render,move,
      setActive(value) {active=value;},
      leave() {pointer.active=false;},
      dispose() {disposed=true;painter.dispose();}
    };
  }
  window.MengsuMoonSchool=Object.freeze({create});
})();
