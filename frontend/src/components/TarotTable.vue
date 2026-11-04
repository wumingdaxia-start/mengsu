<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as THREE from 'three'
import { gsap } from 'gsap'
const props = defineProps({ cards: Array, selected: Array, limit: Number, locked: Boolean, focused: Number })
const emit = defineEmits(['pick', 'hover'])
const host = ref(null), unavailable = ref(false)
let renderer, scene, camera, observer, media, frame = 0, active = -1, disposed = false
const groups = [], textures = [], tweens = new Set(), ray = new THREE.Raycaster(), pointer = new THREE.Vector2()
let particles, particleHome, burst = { value: 0 }
function texture(card) {
  const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = 640
  const c = canvas.getContext('2d'); c.fillStyle = card ? '#e9dfc8' : '#161f27'; c.fillRect(0, 0, 384, 640)
  c.strokeStyle = card ? '#72603d' : '#b8a57b'; c.lineWidth = 2; c.strokeRect(19, 19, 346, 602); c.strokeRect(28, 28, 328, 584)
  c.translate(192, 282); c.lineWidth = 2
  const circle = (x,y,r) => { c.beginPath(); c.arc(x,y,r,0,Math.PI*2); c.stroke() }
  const line = (x,y,a,b) => { c.beginPath(); c.moveTo(x,y); c.lineTo(a,b); c.stroke() }
  if (!card) {
    circle(0,0,90); circle(0,0,72); circle(0,0,36)
    for(let i=0;i<12;i++){const a=i*Math.PI/6;line(Math.cos(a)*42,Math.sin(a)*42,Math.cos(a)*126,Math.sin(a)*126)}
    for(let i=0;i<8;i++){c.save();c.rotate(i*Math.PI/4);c.strokeRect(-65,-65,130,130);c.restore()}
    c.fillStyle='#c8b68e'; c.font='24px Georgia';c.textAlign='center';c.fillText('STELLAR',0,225)
  } else {
    c.save(); if(card.reversed)c.rotate(Math.PI)
    circle(0,0,113); const glyph=card.glyph
    if(glyph==='moon'){circle(-10,-5,62);c.fillStyle='#e9dfc8';c.beginPath();c.arc(16,-24,55,0,Math.PI*2);c.fill();circle(43,68,7)}
    else if(glyph==='sun'||glyph==='star'){circle(0,0,glyph==='sun'?44:19);for(let i=0;i<12;i++){const a=i*Math.PI/6;line(Math.cos(a)*58,Math.sin(a)*58,Math.cos(a)*90,Math.sin(a)*90)}}
    else if(glyph==='mountain'||glyph==='journey'){c.beginPath();c.moveTo(-85,64);c.lineTo(-20,-58);c.lineTo(15,5);c.lineTo(43,-35);c.lineTo(88,64);c.closePath();c.stroke();circle(45,-72,15);line(-80,86,80,86)}
    else if(glyph==='balance'){line(0,-70,0,75);line(-75,-35,75,-35);line(-75,-35,-96,22);line(-75,-35,-54,22);line(75,-35,54,22);line(75,-35,96,22);line(-96,22,-54,22);line(54,22,96,22);line(-38,75,38,75)}
    else if(glyph==='lantern'){c.strokeRect(-32,-42,64,93);line(-32,-42,0,-78);line(0,-78,32,-42);circle(0,0,13);for(let i=0;i<8;i++){const a=i*Math.PI/4;line(Math.cos(a)*62,Math.sin(a)*62,Math.cos(a)*87,Math.sin(a)*87)}}
    else if(glyph==='twin'){circle(-33,0,48);circle(33,0,48);line(0,-90,0,-65);line(0,65,0,90)}
    else if(glyph==='garden'){for(let i=0;i<6;i++){const a=i*Math.PI/3;circle(Math.cos(a)*36,Math.sin(a)*36,36)}circle(0,0,19);line(0,74,0,96)}
    else{for(let i=0;i<3;i++){c.save();c.rotate(i*Math.PI/3);c.beginPath();c.ellipse(0,0,83,31,0,0,Math.PI*2);c.stroke();c.restore()}circle(0,0,9)}
    c.restore(); c.fillStyle='#51452f';c.textAlign='center';c.font='30px serif';c.fillText(card.name,0,211);c.font='20px serif';c.fillText(card.reversed?'逆位':'正位',0,254)
  }
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;textures.push(t);return t
}
function render(){ if(disposed||!renderer||!particles)return; const positions=particles.geometry.attributes.position;for(let i=0;i<positions.count;i++){positions.setXYZ(i,particleHome[i*3]*(1+burst.value*.22),particleHome[i*3+1]*(1+burst.value*.22),particleHome[i*3+2]+burst.value*.6)}positions.needsUpdate=true;renderer.render(scene,camera) }
function request(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;render()})}
function animate(object,values){
  gsap.killTweensOf(object)
  if(media?.matches){Object.assign(object,values);request();return}
  let t; t=gsap.to(object,{...values,duration:.85,ease:'power3.out',onUpdate:request,onComplete:()=>tweens.delete(t),onInterrupt:()=>tweens.delete(t)});tweens.add(t)
}
function resize(){if(!renderer)return;const w=host.value.clientWidth,h=host.value.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.position.z=w<650?13.8:11.6;camera.updateProjectionMatrix();request()}
function hit(e){const r=host.value.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hits=ray.intersectObjects(groups.flatMap(g=>g.children));return hits.length?hits[0].object.userData.index:-1}
function hover(index){if(active===index)return;active=index;emit('hover',index);sync();if(host.value)host.value.style.cursor=index>=0&&!props.locked?'pointer':'default'}
function sync(){groups.forEach((g,i)=>{const picked=props.selected.includes(i),highlight=active===i||props.focused===i;animate(g.position,{z:picked ? .45 : highlight ? .32 : 0});animate(g.rotation,{y:picked?Math.PI:0,z:picked?0:g.userData.tilt});g.children[0].material.color.set(highlight||picked?'#ddc68e':'#65717b')});request()}
function move(e){if(!props.locked)hover(hit(e))}
function leave(){hover(-1)}
function click(e){const i=hit(e);if(i>=0&&!props.locked&&!props.selected.includes(i)&&props.selected.length<props.limit){emit('pick',i)}}
watch(()=>[props.selected.join(','),props.focused,props.locked],sync)
watch(()=>props.selected.length,(count,previous)=>{if(count>previous){burst.value=1;animate(burst,{value:0})}})
onMounted(()=>{
  media=matchMedia('(prefers-reduced-motion: reduce)')
  try {
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;host.value.appendChild(renderer.domElement)
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(38,1,.1,100);camera.position.set(0,0,11.6)
    const geometry=new THREE.BoxGeometry(1.18,1.98,.065),plane=new THREE.PlaneGeometry(1.12,1.92)
    props.cards.forEach((card,i)=>{const g=new THREE.Group();const tilt=(i%6-2.5)*-.024;g.userData.tilt=tilt;g.position.set((i%6-2.5)*1.5,i<6?1.27:-1.27,0);g.rotation.z=tilt
      const edge=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#65717b'}));const back=new THREE.Mesh(plane,new THREE.MeshBasicMaterial({map:texture(null)}));back.position.z=.036
      const front=new THREE.Mesh(plane,new THREE.MeshBasicMaterial({map:texture(card)}));front.position.z=-.036;front.rotation.y=Math.PI
      ;[edge,back,front].forEach(m=>{m.userData.index=i;g.add(m)});groups.push(g);scene.add(g)
    })
    particleHome=new Float32Array(260*3);let seed=23;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};for(let i=0;i<260;i++){particleHome[i*3]=(random()-.5)*13;particleHome[i*3+1]=(random()-.5)*7;particleHome[i*3+2]=-1.2-random()*2}
    const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(particleHome.slice(),3));particles=new THREE.Points(pg,new THREE.PointsMaterial({color:'#cbbb91',size:.026,transparent:true,opacity:.65,depthWrite:false}));scene.add(particles)
    observer=new ResizeObserver(resize);observer.observe(host.value);resize();sync()
    host.value.addEventListener('pointermove',move);host.value.addEventListener('pointerleave',leave);host.value.addEventListener('click',click)
    renderer.domElement.addEventListener('webglcontextlost',lost);media.addEventListener('change',reduce)
  }catch{unavailable.value=true;renderer?.dispose()}
})
function lost(e){e.preventDefault();unavailable.value=true;tweens.forEach(t=>t.kill());tweens.clear()}
function reduce(){tweens.forEach(t=>t.kill());tweens.clear();sync()}
onBeforeUnmount(()=>{disposed=true;cancelAnimationFrame(frame);observer?.disconnect();media?.removeEventListener('change',reduce);tweens.forEach(t=>t.kill());host.value?.removeEventListener('pointermove',move);host.value?.removeEventListener('pointerleave',leave);host.value?.removeEventListener('click',click);renderer?.domElement.removeEventListener('webglcontextlost',lost);const geometries=new Set(),materials=new Set();scene?.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material)});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer?.dispose()})
</script>
<template><div ref="host" class="tarot-table" aria-hidden="true"><div class="table-orbit"></div><div v-if="unavailable" class="table-fallback"><span>STELLAR / 牌阵</span><p>使用下方牌号选择，翻牌与解读仍然可用。</p></div></div></template>
<style scoped>
.tarot-table{height:430px;position:relative;isolation:isolate;overflow:hidden;background:radial-gradient(ellipse at center,#202b2d 0%,#11191f 65%)}.tarot-table :deep(canvas){position:absolute;inset:0;width:100%;height:100%}.table-orbit{position:absolute;inset:12% 11%;border:1px solid #bca77e20;border-radius:50%;transform:rotate(-12deg);z-index:-1}.table-orbit:after{content:'';position:absolute;inset:8%;border:1px solid #bca77e18;border-radius:50%}.table-fallback{position:absolute;inset:0;display:grid;place-content:center;text-align:center;color:#b9ab8e;padding:20px}.table-fallback span{font:26px Georgia}.table-fallback p{font-size:13px}@media(max-width:650px){.tarot-table{height:270px}}
</style>
