<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
gsap.registerPlugin(CustomEase)
CustomEase.create('dreamFlow', 'M0,0 C0.323,0 0.301,0.379 0.4,0.661 0.495,0.932 0.747,1.002 1,1')
import { createCottonTexture, createCottonCloud } from '../scene/cottonCloud'
import { createCloudTransition } from '../scene/cloudTransition'
const host = ref(null), active = ref(0), ripples = ref([]), fallback = ref(false)
let renderer, scene, camera, frame, observer, media, transition, tween
let settled = 0, destination = 0, queued = null, reduced = false, disposed = false, lastWheel = 0
const travel = { progress: 0 }, touch = { x: 0, y: 0 }
const pointer = { x: 0, y: 0 }, groups = [], resources = new Set(), timers = new Set()
const colors = [0xc5b3d8, 0xd2b8d7, 0xb9c4e1, 0xdcc2d5, 0xc0b6dd]
function select(index, event) {
  if (tween) { queued = index; return }
  if (index === active.value) return
  active.value = index; destination = index
  if (event && !reduced) {
    const id = performance.now(); ripples.value.push({ id, x: event.clientX, y: event.clientY })
    const timer = setTimeout(() => { ripples.value = ripples.value.filter(r => r.id !== id); timers.delete(timer) }, 1500); timers.add(timer)
  }
  if (reduced || !renderer || fallback.value) { settled=index; travel.progress=0; return }
  if (event?.clientX !== undefined) transition.uniforms.origin.value.set(event.clientX / innerWidth, 1-event.clientY / innerHeight)
  else transition.uniforms.origin.value.set(.5,.5)
  tween=gsap.to(travel,{progress:1,duration:2,ease:'dreamFlow',onComplete(){
    settled=destination;travel.progress=0;tween=null
    const next=queued;queued=null
    if(next!==null && next!==settled)select(next)
  }})
}
function next(event) { if (!event.target.closest('button')) select((active.value + 1) % 5, event) }
function move(event) { if(reduced)return; pointer.x = event.clientX / innerWidth * 2 - 1; pointer.y = event.clientY / innerHeight * 2 - 1 }
function wheel(event) { const now=performance.now();if(Math.abs(event.deltaY)<20||tween||now-lastWheel<850)return;lastWheel=now;select((active.value+1)%5) }
function startTouch(event){touch.x=event.changedTouches[0].clientX;touch.y=event.changedTouches[0].clientY}
function endTouch(event){if(tween)return;const p=event.changedTouches[0];if(touch.y-p.clientY>65&&Math.abs(touch.x-p.clientX)<100)select((active.value+1)%5)}
function material(color, extra = {}) { const m = new THREE.MeshStandardMaterial({ color, roughness: .64, ...extra }); resources.add(m); return m }
function mesh(geometry, mat, parent, x=0,y=0,z=0) { resources.add(geometry); const m = new THREE.Mesh(geometry, mat); m.position.set(x,y,z); parent.add(m); return m }
function door(parent, x, y, z, angle=0) {
  const g = new THREE.Group(); g.position.set(x,y,z); g.rotation.y = angle; parent.add(g)
  const ivory = material(0xfff5df), gold = material(0xd8bf8f, { metalness:.45, roughness:.35 })
  mesh(new THREE.BoxGeometry(.16,3.5,.25), ivory,g,-1,0,0); mesh(new THREE.BoxGeometry(.16,3.5,.25), ivory,g,1,0,0); mesh(new THREE.BoxGeometry(2.16,.16,.25), ivory,g,0,1.75,0)
  const leaf = new THREE.Group(); leaf.position.set(-.9,0,0); leaf.rotation.y = -.75; g.add(leaf)
  mesh(new THREE.BoxGeometry(1.8,3.34,.1), material(0xdae8e3),leaf,.9,0,0)
  for (const yy of [-.8,.8]) mesh(new THREE.BoxGeometry(1.38,1.2,.06),ivory,leaf,.9,yy,.08)
  mesh(new THREE.SphereGeometry(.055,12,8),gold,leaf,1.6,-.1,.16)
  const glow = mesh(new THREE.PlaneGeometry(1.85,3.3),material(0xffefd0,{emissive:0xffd8a0,emissiveIntensity:.7,transparent:true,opacity:.35,side:THREE.DoubleSide}),g,0,0,-.08)
  glow.userData.glow = true
}
function build() {
  scene = new THREE.Scene(); scene.background = new THREE.Color(colors[0]); scene.fog = new THREE.FogExp2(colors[0],.022)
  camera = new THREE.PerspectiveCamera(46,1,.1,150); camera.position.set(0,2,16)
  scene.add(new THREE.HemisphereLight(0xfff5e8,0x8faec0,2.8))
  const sun = new THREE.DirectionalLight(0xffedcc,3.4); sun.position.set(-7,12,8); scene.add(sun)
  const cottonTexture = createCottonTexture(resources)
  const rock = material(0xeee8dc), trim = material(0xfff5e3)
  for(let k=0;k<5;k++) {
    const group = new THREE.Group(); scene.add(group); groups.push(group)
    const objects = new THREE.Group(); group.add(objects); group.userData.objects = objects
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const ctx=canvas.getContext('2d');const gradient=ctx.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'rgba(255,251,242,.65)');gradient.addColorStop(.4,'rgba(242,246,251,.3)');gradient.addColorStop(1,'rgba(240,245,250,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
    const texture=new THREE.CanvasTexture(canvas);resources.add(texture);
    for(let j=0;j<6;j++){const mat=new THREE.SpriteMaterial({map:texture,transparent:true,opacity:.55,depthWrite:false});resources.add(mat);const mist=new THREE.Sprite(mat);mist.position.set((j%2?1:-1)*(2.8+Math.floor(j/2)),(Math.floor(j/2)-1)*2,8-j*.3);mist.scale.set(8,6,1);mist.userData.phase=j;mist.userData.origin=mist.position.clone();group.add(mist)}
    // Actual meshes are lit from the same direction across every scene.
    for(let i=0;i<13;i++){
      const a=i*2.399+k; const cloud = createCottonCloud(cottonTexture,resources,(i+k)%5); cloud.position.set(Math.cos(a)*(5+i%3),-1.8+(i%5)*1.35,-5-(i%4)*3)
      cloud.userData.phase=i; cloud.userData.origin=cloud.position.clone(); group.add(cloud)
    }
    for(let i=0;i<15;i++){ const a=i*.19+k*.5; const radius=k===1?3.4:2.8; const stair=mesh(new THREE.BoxGeometry(2.1,.18,.7),trim,objects,Math.sin(a)*radius,-2.7+i*.19,3-i*.5); stair.rotation.y=-a*.65 }
    const island=mesh(new THREE.SphereGeometry(1,48,24),rock,objects,0,-3.2,-1.5); island.scale.set(4.7,.65,3.5)
    if(k===0){door(objects,-1.9,.3,-2,-.15);door(objects,3.6,1.8,-7,.4)}
    if(k===1){door(objects,0,.8,-3,0); const ring=mesh(new THREE.TorusGeometry(3.3,.07,16,100),trim,objects,0,.5,-4);ring.rotation.y=.35}
    if(k===2){for(let j=0;j<3;j++)door(objects,(j-1)*3.4,j*.8,-3-j*3,(j-1)*.25)}
    if(k===3){door(objects,2,.8,-4,-.5);for(let j=0;j<5;j++){const orb=mesh(new THREE.SphereGeometry(.45+j*.12,32,24),material(0xf8e2c8,{metalness:.25,roughness:.2}),objects,-4+j*1.6,2+Math.sin(j),-5-j);orb.userData.float=j}}
    if(k===4){door(objects,0,1,-4,.2);for(let j=0;j<3;j++){const ring=mesh(new THREE.TorusGeometry(3+j*.8,.045,12,100),trim,objects,0,.5,-6-j);ring.rotation.set(.25*j,.2*j,0)}}
  }
}
function prepareMaterials() { groups.forEach(group=>{
  group.userData.surfaces=[]
  group.traverse(child=>{if(child.isMesh){child.material=child.material.clone();resources.add(child.material)}
    if(child.isMesh||child.isSprite){const mat=child.material;mat.userData.baseOpacity=mat.opacity;mat.transparent=true;group.userData.surfaces.push(mat)}
  })
}) }
function resize() { if(!renderer)return; const w=host.value.clientWidth,h=host.value.clientHeight; renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();transition?.resize(w,h) }
function stage(index, depth, seconds) {
  groups.forEach((g,k)=>{g.visible=k===index})
  const group=groups[index], departing=Math.max(0,depth)
  group.position.set(0,-departing*.5,depth*7);group.rotation.y=0
  group.userData.surfaces.forEach(mat=>{mat.opacity=mat.userData.baseOpacity})
  for(const child of group.children){if(child.userData.phase!==undefined){const origin=child.userData.origin,side=origin.x>=0?1:-1
    child.position.x=origin.x+side*departing*5+(reduced?0:Math.sin(seconds*.16+child.userData.phase)*.22)
    child.position.y=origin.y+departing*.4
  }}
  group.userData.objects.rotation.y=reduced?0:Math.sin(seconds*.12+index)*.035
  scene.background.set(colors[index]);scene.fog.color.copy(scene.background)
  scene.fog.density=.022+Math.max(0,-depth)*.014
}
function render(time=0) {
  if(disposed)return
  const seconds=time*.001
  camera.position.x+=(pointer.x*.85-camera.position.x)*.025;camera.position.y+=(2-pointer.y*.5-camera.position.y)*.025;camera.lookAt(0,0,-3)
  if(tween){
    stage(settled,travel.progress*.18,seconds);transition.capture(0,scene,camera)
    stage(destination,(travel.progress-1)*.18,seconds);transition.capture(1,scene,camera)
    transition.draw(travel.progress,seconds)
  }else{stage(settled,0,seconds);transition.capture(0,scene,camera);transition.draw(0,seconds)}
  frame=requestAnimationFrame(render)
}
function visibility(){ if(document.hidden){cancelAnimationFrame(frame);tween?.pause()}else if(renderer){tween?.resume();frame=requestAnimationFrame(render)} }
function motionChange(){reduced=media.matches;if(reduced){pointer.x=pointer.y=0;tween?.kill();tween=null;settled=destination;travel.progress=0;queued=null}}
onMounted(()=>{
  media=matchMedia('(prefers-reduced-motion: reduce)');motionChange();media.addEventListener('change',motionChange)
  try {renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;host.value.appendChild(renderer.domElement);build();prepareMaterials();transition=createCloudTransition(renderer,resources);observer=new ResizeObserver(resize);observer.observe(host.value);resize();render()}catch{fallback.value=true}
  document.addEventListener('visibilitychange',visibility)
})
onBeforeUnmount(()=>{disposed=true;tween?.kill();cancelAnimationFrame(frame);observer?.disconnect();media?.removeEventListener('change',motionChange);document.removeEventListener('visibilitychange',visibility);timers.forEach(clearTimeout);resources.forEach(r=>r.dispose());renderer?.dispose()})
</script>
<template>
 <section class="cloud-world" :class="{fallback}" aria-label="五层梦境空间，点击切换下一层" @click="next" @pointermove="move" @wheel.prevent="wheel" @touchstart.passive="startTouch" @touchend.passive="endTouch">
  <div ref="host" class="cloud-canvas" aria-hidden="true"/>
  <div class="cloud-veil" aria-hidden="true"/>
  <span v-for="r in ripples" :key="r.id" class="cloud-ripple" :style="{left:r.x+'px',top:r.y+'px'}" aria-hidden="true"/>
  <nav class="cloud-pagination" aria-label="梦境层级">
   <button v-for="(_,i) in 5" :key="i" :class="{active:active===i}" :aria-label="`第 ${i+1} 层`" :aria-current="active===i?'step':undefined" @click.stop="select(i,$event)"><span/></button>
  </nav>
 </section>
</template>
<style scoped>
.cloud-world{position:fixed;inset:0;overflow:hidden;background:#c8e0ed;cursor:pointer;touch-action:manipulation}.cloud-canvas{position:absolute;inset:0}.cloud-canvas :deep(canvas){display:block;width:100%;height:100%}.cloud-veil{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 20% 5%,#ffefd329,transparent 65%)}.fallback{background:url('/dream-cloud-doors.jpg') center/cover}.cloud-pagination{position:absolute;bottom:max(28px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);display:flex;gap:3px;z-index:5}.cloud-pagination button{width:40px;height:44px;display:grid;place-items:center;padding:0;border:0;background:transparent;box-shadow:none;border-radius:12px}.cloud-pagination span{width:6px;height:6px;border-radius:50%;background:#fff8;box-shadow:0 1px 4px #4a718d25;transition:transform .45s cubic-bezier(.22,1,.36,1),background .45s}.cloud-pagination .active span{background:#fff;transform:scale(1.55)}.cloud-pagination button:focus-visible{outline:2px solid white;outline-offset:0}.cloud-ripple{position:fixed;width:180px;height:180px;margin:-90px 0 0 -90px;border-radius:50%;border:1px solid #fff9;background:radial-gradient(circle,transparent 48%,#fff4 65%,transparent 72%);pointer-events:none;animation:cloud-ripple 1.5s cubic-bezier(.22,1,.36,1) forwards}@keyframes cloud-ripple{from{transform:scale(.16);opacity:.75}to{transform:scale(3);opacity:0}}@media(prefers-reduced-motion:reduce){.cloud-pagination span{transition:none}.cloud-ripple{display:none}}
</style>

<style scoped>.cloud-world .cloud-pagination{width:auto;max-width:none;right:auto;margin:0;padding:0;background:transparent;border:0;box-shadow:none;backdrop-filter:none;grid-template-columns:none}.cloud-world .cloud-pagination button{flex:0 0 40px}</style>

