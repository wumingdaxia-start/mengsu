<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { isLoggedIn, refreshSession } from '../auth'
import { entryDestination } from '../workspaces'

const router = useRouter()
const frame = ref(null)
const failed = ref(false)
let loadingTimer = 0
async function enter(path = '/safety') {
  await refreshSession()
  const destination = entryDestination(path, isLoggedIn())
  if (!destination) return
  sessionStorage.setItem('mengsu-entered', '1')
  router.push(destination)
}
function receive(event) {
  if (event.origin !== location.origin || event.source !== frame.value?.contentWindow) return
  if (event.data?.type === 'mengsu:ready') { clearTimeout(loadingTimer); failed.value = false }
  if (event.data?.type === 'mengsu:enter') {
    enter(event.data.path || '/safety')
  }
}
onMounted(() => {
  window.addEventListener('message', receive)
  loadingTimer = window.setTimeout(() => { failed.value = true }, 12000)
})
onBeforeUnmount(() => { clearTimeout(loadingTimer); window.removeEventListener('message', receive) })
</script>

<template>
  <section class="ripple-entry" aria-label="花屿星梦境入口">
    <iframe ref="frame" src="/entry-ripples/index.html?v=crisp-star-flow-20261030-6" title="花屿星互动：花屿安康守护、鱼庭花屿星与星栈心灵"
      sandbox="allow-scripts allow-same-origin allow-downloads allow-popups allow-popups-to-escape-sandbox"
      referrerpolicy="no-referrer" @error="failed = true" />
    <div v-if="failed" class="ripple-entry-fallback" role="status">
      <p>水面暂时未能载入。</p>
      <div class="fallback-links"><button @click="enter('/safety')">安康守护</button><button @click="enter('/dream')">花屿星</button><button @click="enter('/psychology')">心灵</button></div>
    </div>
  </section>
</template>

<style scoped>
.ripple-entry { position: fixed; inset: 0; width: 100%; height: 100dvh; overflow: hidden; background: #e8eef3; color-scheme: light; }
.ripple-entry iframe { display: block; width: 100%; height: 100%; border: 0; }
.ripple-entry-fallback { position: absolute; inset: 0; display: grid; align-content: center; justify-items: center; gap: 20px; color: #49647a; background: #e8eef3; }
.ripple-entry-fallback button { color: #49647a; background: #fff; border: 1px solid #bacbd8; }
</style>
