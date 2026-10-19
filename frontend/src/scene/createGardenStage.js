import * as T from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
export async function createDreamStage(canvas, { onReady, onError, reducedMotion = false, onDrag, signal } = {}) {
  let renderer
  try { renderer = new T.WebGLRenderer({canvas, antialias:true}) } catch { onError?.(); return null }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=1.25
  const scene=new T.Scene(); scene.background=new T.Color('#b9b7d5'); scene.fog=new T.Fog('#b9b7d5',22,48)
  const camera=new T.PerspectiveCamera(39,1,.1,80), pmrem=new T.PMREMGenerator(renderer), room=new RoomEnvironment(), env=pmrem.fromScene(room,.04)
  scene.environment=env.texture; room.dispose(); pmrem.dispose()
  scene.add(new T.HemisphereLight('#fff1ff','#777da0',2.2))
  for(const [color,power,x,y,z] of [['#ffe0ed',70,-6,7,5],['#bae5ff',90,6,4,3]]) {const l=new T.PointLight(color,power,30);l.position.set(x,y,z);scene.add(l)}
  const pearl=new T.MeshPhysicalMaterial({color:'#e6b0d3',metalness:.22,roughness:.25,clearcoat:1,iridescence:.6,side:T.DoubleSide}), blue=pearl.clone(), paper=pearl.clone()
  blue.color.set('#a9cfe7');paper.color.set('#f2e3ee')
  const gold=new T.MeshStandardMaterial({color:'#e8d5b1',metalness:.75,roughness:.26}), glow=new T.MeshStandardMaterial({color:'#fff3dd',emissive:'#ffe4ca',emissiveIntensity:.65})
  const islandTop=new T.MeshStandardMaterial({color:'#9eb6aa',roughness:.76}), islandRock=new T.MeshStandardMaterial({color:'#55556d',roughness:.6}), cloudMat=new T.MeshPhysicalMaterial({color:'#f3e9f5',roughness:.88,transparent:true,opacity:.66})
  const worlds=[new T.Group(),new T.Group(),new T.Group()];worlds.forEach(g=>scene.add(g))
  const pools=[]
  const raycaster=new T.Raycaster(), pointer=new T.Vector2()
  function island(parent,x,y,z,s=1,accent=pearl){
    const root=new T.Group();root.position.set(x,y,z);root.scale.setScalar(s);parent.add(root)
    const top=new T.Mesh(new T.CylinderGeometry(2.2,1.65,.42,9),islandTop);top.position.y=.1;top.scale.z=.74;root.add(top)
    for(let layer=0;layer<6;layer++){
      const radius=1.85-layer*.24
      const geometry=new T.CylinderGeometry(radius,radius*.82,.48,18,2)
      const pos=geometry.attributes.position
      for(let j=0;j<pos.count;j++){const a=Math.atan2(pos.getZ(j),pos.getX(j)),r=1+.09*Math.sin(a*5+layer)+.06*Math.cos(a*9);pos.setXYZ(j,pos.getX(j)*r,pos.getY(j)+.06*Math.sin(a*7),pos.getZ(j)*r*.78)}
      geometry.computeVertexNormals()
      const rock=new T.Mesh(geometry,islandRock);rock.position.set(Math.sin(layer)*.13,-.27-layer*.43,Math.cos(layer)*.09);root.add(rock)
    }
    const water=new T.ShaderMaterial({side:T.DoubleSide,uniforms:{uTime:{value:0},uHit:{value:new T.Vector2(.5,.5)},uBorn:{value:-20}},vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv; uniform float uTime;uniform vec2 uHit;uniform float uBorn;void main(){float age=uTime-uBorn;float d=distance(vUv,uHit);float ring=sin(d*85.-age*10.)*exp(-pow((d-age*.18)*10.,2.))*exp(-age*.8);float light=pow(.5+.5*sin(vUv.x*25.+sin(vUv.y*22.+uTime*.2)),14.)*.16;vec3 col=mix(vec3(.37,.64,.69),vec3(.78,.89,.87),vUv.y);col+=light+ring*.22;gl_FragColor=vec4(col,1.);}`})
    const pool=new T.Mesh(new T.CircleGeometry(1.05,80),water);pool.rotation.x=-Math.PI/2;pool.scale.y=.72;pool.position.set(.15,.325,0);root.add(pool);pools.push(pool)
    for(let i=0;i<28;i++){const a=i*2.39996,r=1.25+(i%5)*.15;const stone=new T.Mesh(new T.IcosahedronGeometry(.08+(i%3)*.035,1),i%4?islandTop:islandRock);stone.position.set(Math.cos(a)*r,.34,Math.sin(a)*r*.72);stone.scale.y=.6;root.add(stone)}
    for(let i=0;i<7;i++){const shard=new T.Mesh(new T.OctahedronGeometry(.12+i%3*.045),i%2?blue:glow),a=i*2.4;shard.position.set(Math.cos(a)*(1.4+i%2*.35),.7+i%3*.3,Math.sin(a)*1.1);root.add(shard)}
    return root
  }
  island(worlds[0],3,-.8,0,1.15,pearl);island(worlds[0],-5,-2.7,-2,.58,blue);island(worlds[0],6.6,2.3,-5,.48,blue)
  const cloud0=new T.Group();worlds[0].add(cloud0)
  for(let i=0;i<32;i++){const a=i*2.39996,r=3+(i%7)*.7,m=new T.Mesh(new T.SphereGeometry(.55+i%4*.14,24,16),cloudMat);m.position.set(Math.cos(a)*r,-2.1+Math.sin(a*1.4)*1.25,-2-(i%5)*.55);m.scale.set(1.5,.62,1);cloud0.add(m)}
  const moon=new T.Mesh(new T.SphereGeometry(1.15,80,64),glow);moon.position.set(3,1.9,-2);worlds[1].add(moon)
  for(let i=0;i<3;i++){const ring=new T.Mesh(new T.TorusGeometry(2+i*.43,.025,12,180),i===1?pearl:gold);ring.position.copy(moon.position);ring.rotation.set(.7+i*.3,.4+i*.3,.2);worlds[1].add(ring)}
  island(worlds[1],-4,-2.8,-1,.65,blue);island(worlds[1],5.8,-3.2,-4,.43,pearl)
  for(let i=0;i<24;i++){const m=new T.Mesh(new T.SphereGeometry(.42+i%3*.12,20,14),cloudMat);m.position.set(-8+i*.7,-3.1+Math.sin(i*.8)*.45,-3-i%4*.55);m.scale.set(1.6,.55,1);worlds[1].add(m)}
  const pages=[]
  for(let i=0;i<22;i++){
    const g=new T.PlaneGeometry(1,1.4,16,20),p=g.attributes.position
    for(let j=0;j<p.count;j++)p.setZ(j,Math.sin(p.getX(j)*2.7)*.2+p.getY(j)**2*.12)
    g.computeVertexNormals();const page=new T.Mesh(g,i%3?paper:blue),t=i/21
    page.position.set(2.8+Math.sin(t*8)*2.6,-3+t*7,-1-Math.cos(t*8)*1.8);page.rotation.set(.2,t*2-.7,Math.sin(t*8)*.5);pages.push(page);worlds[2].add(page)
    for(let k=0;k<5;k++){const pts=[];for(let j=0;j<=20;j++){const x=-.34+j*.034,y=.4-k*.16;pts.push(new T.Vector3(x,y,Math.sin(x*2.7)*.2+y*y*.12+.008))}page.add(new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:'#b09bbd'})))}
  }
  island(worlds[2],-4,-3,-1,.65,blue);island(worlds[2],5.5,2,-4,.48,pearl)
  const crystals=new T.Group();scene.add(crystals)
  for(let i=0;i<36;i++){const a=i*2.39996,r=4+i%7*.8,m=new T.Mesh(new T.OctahedronGeometry(.07+i%4*.035),i%2?blue:pearl);m.position.set(Math.cos(a)*r,Math.sin(a)*5,-3-i%5*1.5);m.rotation.set(i,i*.3,i*.6);crystals.add(m)}
  const ground=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:'#b9b4d1',metalness:.25,roughness:.45}));ground.rotation.x=-Math.PI/2;ground.position.y=-4.2;scene.add(ground)
  let frame=0,disposed=false,paused=reducedMotion,reduced=reducedMotion,chapter=0,angle=0,tx=0,ty=0,x=0,y=0,time=0,last=0,exit=0,drag=null
  function wake(){if(!frame&&!disposed&&!document.hidden)frame=requestAnimationFrame(draw)}
  function draw(now){frame=0;if(disposed||document.hidden)return;const dt=Math.min((now-(last||now))/1000,.05);last=now;if(!paused&&!reduced)time+=dt;x+=(tx-x)*.06;y+=(ty-y)*.06;const mobile=camera.aspect<.85;camera.position.set(x*2.8,1.1-y*1.5,(mobile?23:16)-exit*1.8);camera.lookAt(mobile?1.3:.6,mobile?.9:.2,0);worlds.forEach((g,i)=>{g.visible=i===chapter;g.position.x=mobile?-1.2:0;g.rotation.y=angle+x*.24;g.position.y=Math.sin(time*.26)*.075});crystals.rotation.y=time*.012;pools.forEach(p=>p.material.uniforms.uTime.value=time);cloud0.position.x=Math.sin(time*.08)*.3-x*.18;renderer.render(scene,camera);if(!paused&&!reduced||Math.abs(x-tx)>.001||Math.abs(y-ty)>.001)wake()}
  function resize(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();wake()}
  function move(e){if(reduced||paused)return;const r=canvas.getBoundingClientRect();tx=(e.clientX-r.left)/r.width*2-1;ty=(e.clientY-r.top)/r.height*2-1;if(drag){touchWater(e);angle=drag.angle+(e.clientX-drag.x)*.002;onDrag?.()}wake()}
  function touchWater(e){if(paused||reduced)return;const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);scene.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(pools.filter(p=>p.parent.parent===worlds[chapter]),false)[0];if(hit){hit.object.material.uniforms.uHit.value.copy(hit.uv);hit.object.material.uniforms.uBorn.value=time;wake()}}
  function down(e){if(e.button>0)return;touchWater(e);drag={x:e.clientX,angle};canvas.setPointerCapture(e.pointerId)}
  function up(){drag=null}
  function visibility(){if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0}else wake()}
  canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);document.addEventListener('visibilitychange',visibility)
  const observer=new ResizeObserver(resize);observer.observe(canvas)
  function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);signal?.removeEventListener('abort',dispose);const gs=new Set(),ms=new Set();scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material)});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());env.dispose();renderer.dispose()}
  signal?.addEventListener('abort',dispose,{once:true});if(signal?.aborted){dispose();return null}resize();onReady?.()
  return {setChapter(v){chapter=v;wake()},setPaused(v){paused=v;wake()},setReduced(v){reduced=v;if(v){tx=ty=0}wake()},setExit(v){exit=v;wake()},rotate(v){angle+=v;wake()},dispose}
}
