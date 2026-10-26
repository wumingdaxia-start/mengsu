<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
const props = defineProps({ scene: { type: Number, default: 0 } })
const frame = ref(null)
const source = computed(() => `/entry-ripples/index.html?background=1&scene=${props.scene}&v=health-scenes-1`)
let pending = 0
let point = null
function sendPoint(event) {
  point = { x: event.clientX, y: event.clientY }
  if (pending) return
  pending = requestAnimationFrame(() => {
    pending = 0
    frame.value?.contentWindow?.postMessage({ type: 'mengsu:background-pointer', ...point }, location.origin)
  })
}
onMounted(() => window.addEventListener('pointermove', sendPoint, { passive: true }))
onBeforeUnmount(() => { window.removeEventListener('pointermove', sendPoint); cancelAnimationFrame(pending) })
</script>
<template><div class="health-scene-background" aria-hidden="true"><iframe :key="scene" ref="frame" :src="source" title="健康空间动态背景" tabindex="-1" sandbox="allow-scripts allow-same-origin" /><div class="reading-veil" /></div></template>
<style scoped>
.health-scene-background{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;background:#f8f5fb}.health-scene-background iframe{display:block;width:100%;height:100%;border:0;opacity:.35}.reading-veil{position:absolute;inset:0;background:linear-gradient(110deg,rgba(250,248,252,.57),rgba(250,248,252,.28))}
</style>
