<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import HealthSceneBackground from '../components/HealthSceneBackground.vue'

const router = useRouter()
const frame = ref(null)
const loaded = ref(false)
const timedOut = ref(false)
const address = new URL(location.origin)
address.port = '3001'
address.pathname = '/'
address.search = '?mengsu=1'
const source = address.href
let timer
function receive(event) {
  if (event.origin !== address.origin || event.source !== frame.value?.contentWindow) return
  if (event.data?.type === 'mengsu:safety-ready') { loaded.value = true; timedOut.value = false; clearTimeout(timer) }
  if (event.data?.type === 'mengsu:return-entry') router.push('/entry')
  if (event.data?.type === 'mengsu:login') router.push({ path: '/login', query: { next: '/safety' } })
}
function retry() {
  loaded.value = false
  timedOut.value = false
  frame.value.src = source
  clearTimeout(timer)
  timer = window.setTimeout(() => { if (!loaded.value) timedOut.value = true }, 15000)
}
onMounted(() => { window.addEventListener('message', receive); timer = window.setTimeout(() => { if (!loaded.value) timedOut.value = true }, 15000) })
onBeforeUnmount(() => { window.removeEventListener('message', receive); clearTimeout(timer) })
</script>

<template>
  <section class="safety-workspace" aria-label="花屿安全健康空间">
    <HealthSceneBackground :scene="0" />
    <iframe ref="frame" class="safety-original" :src="source" title="安康守护：安全文件夹原版健康管理网站" allow="geolocation" />
    <div v-if="timedOut" class="safety-connection" role="status">
      <h1>安全健康服务尚未连接</h1>
      <p>请通过花屿星启动脚本启动本地服务，再重试连接。</p>
      <div><button type="button" @click="retry">重试连接</button><button type="button" @click="router.push('/entry')">返回主页面</button></div>
    </div>
  </section>
</template>

<style scoped>
.safety-workspace{position:fixed;inset:0;background:transparent}
.safety-workspace>.health-scene-background :deep(iframe){opacity:.72}
.safety-workspace>.health-scene-background :deep(.reading-veil){background:linear-gradient(110deg,rgba(250,248,252,.28),rgba(250,248,252,.1))!important}
.safety-original{position:relative;z-index:1;display:block;width:100%;height:100dvh;border:0;background:transparent}
.safety-dream-side :deep(.health-scene-background){position:absolute;inset:0;z-index:0}
.safety-dream-side :deep(.health-scene-background iframe){opacity:.8}
.safety-dream-side :deep(.health-scene-background .reading-veil){background:linear-gradient(90deg,rgba(244,249,246,.3),rgba(245,250,248,.08))!important}
.safety-connection{position:absolute;z-index:2;inset:0;display:grid;align-content:center;justify-items:center;padding:24px;background:#f7faf6;color:#355b50;text-align:center}
.safety-connection h1{font:500 25px/1.5 var(--display);margin:0 0 12px}.safety-connection p{color:#6c8377;font-size:14px}.safety-connection div{display:flex;gap:12px;margin-top:15px}.safety-connection button{background:white;border:1px solid #d4e2d8;color:#416752;padding:10px 16px;border-radius:8px}
</style>
