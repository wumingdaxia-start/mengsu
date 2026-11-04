<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const HOLD_MS = 1200

const pressing = ref(false)
const progress = ref(0)
const point = ref({ x: 0, y: 0 })
const awakened = ref(false)

let raf = 0
let startedAt = 0

// 粒子数量可自行增减：45 颗，1~5px，18~32 秒缓慢飘落，随机错开出场时间
const particles = Array.from({ length: 45 }, () => ({
  size: Math.random() * 4 + 1,
  left: Math.random() * 100,
  duration: Math.random() * 14 + 18,
  delay: Math.random() * 30
}))

function enter() {
  if (awakened.value) return
  awakened.value = true
  window.setTimeout(() => {
    sessionStorage.setItem('mengsu-entered', '1')
    router.push('/home')
  }, 420)
}

function tick(now) {
  if (pressing.value) {
    progress.value = Math.min(1, (now - startedAt) / HOLD_MS)
    if (progress.value >= 1) {
      enter()
      return
    }
    raf = requestAnimationFrame(tick)
    return
  }
  progress.value = Math.max(0, progress.value - 0.07)
  if (progress.value > 0) raf = requestAnimationFrame(tick)
}

function pressStart(event) {
  if (event.button && event.button !== 0) return
  point.value = { x: event.clientX, y: event.clientY }
  pressing.value = true
  startedAt = performance.now()
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(tick)
}

function pressEnd() {
  pressing.value = false
}

function onKey(event) {
  if (event.key === 'Enter' || event.key === ' ') enter()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div
    class="landing"
    :class="{ awakened }"
    @pointerdown="pressStart"
    @pointerup="pressEnd"
    @pointerleave="pressEnd"
    @pointercancel="pressEnd"
  >
    <div class="landing-mask" />

    <!-- 按住时从指尖涨开的光 -->
    <div
      class="wake"
      :style="{ left: `${point.x}px`, top: `${point.y}px`, opacity: progress * 0.6 }"
    />

    <!-- 三层动态光晕 -->
    <div class="glow-1" />
    <div class="glow-2" />
    <div class="glow-3" />

    <!-- 粒子层 -->
    <div class="particle-container">
      <span
        v-for="(item, index) in particles"
        :key="index"
        class="particle"
        :style="{
          width: `${item.size}px`,
          height: `${item.size}px`,
          left: `${item.left}vw`,
          animationDuration: `${item.duration}s`,
          animationDelay: `${item.delay}s`
        }"
      />
    </div>

    <!-- 文字 -->
    <div class="content">
      <h1>花屿星 · Mengsu</h1>
      <p>记录梦境，回溯夜晚的思绪，解析每一次睡眠与苏醒</p>
      <p class="hold-hint" :class="{ lit: progress > 0.05 }">深呼吸，让梦境浮现……</p>
    </div>

    <!-- 指尖的进度环 -->
    <div
      v-if="progress > 0.01"
      class="hold-ring"
      :style="{
        left: `${point.x}px`,
        top: `${point.y}px`,
        '--p': `${progress * 360}deg`,
        transform: `translate(-50%, -50%) scale(${0.84 + progress * 0.22})`
      }"
    />
  </div>
</template>
