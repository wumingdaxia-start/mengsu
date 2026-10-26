<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const frame = ref(null)
const failed = ref(false)
let loadingTimer = 0
function enter(path = '/login') {
  sessionStorage.setItem('mengsu-entered', '1')
  router.push(path)
}
function receive(event) {
  if (event.origin !== location.origin || event.source !== frame.value?.contentWindow) return
  if (event.data?.type === 'mengsu:ready') { clearTimeout(loadingTimer); failed.value = false }
  if (event.data?.type === 'mengsu:enter') {
    const path = event.data.path || '/home'
    if (['/activity', '/health-analysis'].includes(path)) enter({ path: '/login', query: { next: path } })
    else if (['/home', '/capture', '/dreams', '/ask', '/mood'].includes(path)) enter(path === '/home' ? '/login' : path)
  }
}
onMounted(() => {
  window.addEventListener('message', receive)
  loadingTimer = window.setTimeout(() => { failed.value = true }, 12000)
})
onBeforeUnmount(() => { clearTimeout(loadingTimer); window.removeEventListener('message', receive) })
</script>

<template>
  <section class="ripple-entry" aria-label="梦溯梦境入口">
    <iframe ref="frame" src="/entry-ripples/index.html?v=health-destinations-20261026" title="梦溯互动：花屿水波、鱼庭鱼群与星笺星河"
      sandbox="allow-scripts allow-same-origin allow-downloads allow-popups allow-popups-to-escape-sandbox"
      referrerpolicy="no-referrer" @error="failed = true" />
    <div v-if="failed" class="ripple-entry-fallback" role="status">
      <p>水面暂时未能载入。</p>
      <button @click="enter()">进入梦溯</button>
    </div>
  </section>
</template>

<style scoped>
.ripple-entry { position: fixed; inset: 0; width: 100%; height: 100dvh; overflow: hidden; background: #e8eef3; color-scheme: light; }
.ripple-entry iframe { display: block; width: 100%; height: 100%; border: 0; }
.ripple-entry-fallback { position: absolute; inset: 0; display: grid; align-content: center; justify-items: center; gap: 20px; color: #49647a; background: #e8eef3; }
.ripple-entry-fallback button { color: #49647a; background: #fff; border: 1px solid #bacbd8; }
</style>
