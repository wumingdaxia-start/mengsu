<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({ kind: { type: Number, required: true }, title: { type: String, required: true } })
const root = ref(null), angle = ref(0)
const views = ['正面', '侧面', '俯看']
const rotations = ['rotateX(-12deg) rotateY(-22deg)', 'rotateX(-8deg) rotateY(56deg)', 'rotateX(54deg) rotateY(-18deg)']
const captions = ['看见联系，也容纳不同', '沿着自己的方向，慢慢生长', '在不同的需要之间，找到重心']
const points = computed(() => {
  const result = []
  const add = (x, y, z, family = 0) => result.push({ x, y, z, family })
  if (props.kind === 0) {
    // An even distribution over a sphere, authored without an external particle engine.
    for (let i = 0; i < 168; i++) {
      const y = 1 - 2 * (i + .5) / 168, r = Math.sqrt(1 - y * y), a = i * Math.PI * (3 - Math.sqrt(5))
      add(Math.cos(a) * r * 103, y * 103, Math.sin(a) * r * 103, i % 3)
    }
  } else if (props.kind === 1) {
    for (let i = 0; i < 66; i++) {
      const t = i / 65, a = t * Math.PI * 3.5, radius = 58 + t * 20
      for (let strand = 0; strand < 2; strand++) add(Math.cos(a + strand * Math.PI) * radius, 106 - t * 212, Math.sin(a + strand * Math.PI) * radius, strand)
      if (i % 4 === 0) for (let k = 1; k <= 3; k++) add(Math.cos(a) * radius * (k / 2 - 1), 106 - t * 212, Math.sin(a) * radius * (k / 2 - 1), 2)
    }
  } else {
    for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 52; i++) {
      const a = i * Math.PI * 2 / 52, tilt = (ring * 55 + 20) * Math.PI / 180
      const x = Math.cos(a) * 106, y = Math.sin(a) * 106
      add(x * Math.cos(tilt), y * .62 + x * Math.sin(tilt) * .4, x * Math.sin(tilt) * .7 - y * .65, ring)
    }
    add(0, 0, 0, 3)
  }
  return result.map((p, i) => ({ ...p, id: i, transform: `translate3d(${p.x}px, ${p.y}px, ${p.z}px)`, opacity: .38 + (p.z + 115) / 230 * .55 }))
})
let media, animations = []
function settle() { animations.forEach(a => a.cancel()); animations = [] }
onMounted(() => {
  media = matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', settle)
  if (media.matches || !Element.prototype.animate) return
  root.value.querySelectorAll('.domain-particle').forEach((el, i) => {
    const p = points.value[i], a = i * 2.39996
    animations.push(el.animate([
      { transform: `translate3d(${p.x + Math.cos(a) * 48}px, ${p.y + Math.sin(a) * 44}px, ${p.z - 65}px)`, opacity: 0 },
      { transform: p.transform, opacity: p.opacity }
    ], { duration: 900, delay: i % 4 * 65, easing: 'cubic-bezier(.16,1,.3,1)' }))
  })
})
onBeforeUnmount(() => { settle(); media?.removeEventListener('change', settle) })
</script>

<template>
  <div ref="root" class="domain-particle-scene" :class="`particle-theme-${kind}`">
    <div class="particle-viewport" role="img" :aria-label="`${title}的三维粒子${kind === 0 ? '球体' : kind === 1 ? '成长轨迹' : '星环'}，当前为${views[angle]}视角`">
      <div class="particle-floor" aria-hidden="true"></div>
      <div class="particle-object" :style="{ transform: rotations[angle] }" aria-hidden="true">
        <i v-for="point in points" :key="point.id" class="domain-particle" :class="`particle-family-${point.family}`" :style="{ transform: point.transform, opacity: point.opacity }"></i>
      </div>
      <span class="particle-axis axis-top" aria-hidden="true">{{ ['联系', '方向', '选择'][kind] }}</span>
      <span class="particle-axis axis-bottom" aria-hidden="true">{{ ['变化', '当下', '重心'][kind] }}</span>
    </div>
    <p class="particle-caption">{{ captions[kind] }}</p>
    <div class="particle-angles" role="group" :aria-label="`${title}粒子视角`">
      <button v-for="(view, i) in views" :key="view" type="button" :aria-pressed="angle === i" @click="angle = i">{{ view }}</button>
    </div>
  </div>
</template>

<style scoped>
.domain-particle-scene{--particle-ink:#977858;--particle-second:#6f928b;--particle-third:#c79d73;padding:8px 12px 22px;background:#f7f2ea;border:1px solid #e9e0d4;border-radius:12px;min-width:0;color:#8a7560}
.particle-theme-1{--particle-ink:#8c7968;--particle-second:#bd8a6e;--particle-third:#a5a16e;background:#f8f1e9}
.particle-theme-2{--particle-ink:#b47f69;--particle-second:#8c8495;--particle-third:#b69e68;background:#f8f0e9}
.particle-viewport{height:290px;position:relative;perspective:680px;perspective-origin:50% 44%;overflow:hidden}
.particle-object{position:absolute;left:50%;top:48%;transform-style:preserve-3d;transition:transform 800ms cubic-bezier(.22,1,.36,1)}
.domain-particle{position:absolute;display:block;width:3px;height:3px;border-radius:50%;background:var(--particle-ink);backface-visibility:visible}
.particle-family-1{background:var(--particle-second);width:4px;height:4px}.particle-family-2{background:var(--particle-third)}.particle-family-3{background:var(--particle-ink);width:8px;height:8px;margin:-3px;box-shadow:0 0 0 5px #b47f6914}
.particle-floor{position:absolute;left:calc(50% - 98px);top:calc(48% + 86px);width:196px;height:65px;border:1px solid #a9947d21;border-radius:50%;transform:rotateX(63deg)}
.particle-axis{position:absolute;font-size:10px;line-height:1.5;color:#a08d77}.axis-top{top:12px;left:12px}.axis-bottom{bottom:9px;right:12px}
.particle-caption{text-align:center;margin:0 0 16px;font-size:13px;color:#8d7660}
.particle-angles{display:flex;justify-content:center;gap:6px}
.particle-angles button{font-family:inherit;font-size:12px!important;line-height:1.5;padding:6px 13px!important;min-height:32px;border:1px solid transparent;background:transparent;color:#9b8875;border-radius:6px!important;cursor:pointer}
.particle-angles button[aria-pressed=true]{color:#725d49;border-color:#dfd1c0;background:#fffaf3}.particle-angles button:focus-visible{outline:2px solid #aa8964;outline-offset:3px}
@media(prefers-reduced-motion:reduce){.particle-object{transition:none}}
@media(max-width:600px){.particle-viewport{height:260px}.domain-particle-scene{padding:6px 8px 18px}}
</style>
