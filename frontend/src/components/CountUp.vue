<script setup>
import { onMounted, ref, watch } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  decimals: { type: Number, default: 0 },
  duration: { type: Number, default: 620 }
})

const shown = ref(0)
let raf = 0

function animate(from, to) {
  cancelAnimationFrame(raf)
  const started = performance.now()
  const step = (now) => {
    const progress = Math.min(1, (now - started) / props.duration)
    const eased = 1 - Math.pow(1 - progress, 3)
    shown.value = from + (to - from) * eased
    if (progress < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}

onMounted(() => animate(0, props.value || 0))
watch(
  () => props.value,
  (next, previous) => animate(previous || 0, next || 0)
)
</script>

<template>
  <span class="count-up">{{ shown.toFixed(decimals) }}</span>
</template>
