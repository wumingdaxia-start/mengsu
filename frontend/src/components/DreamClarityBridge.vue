<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import DreamClaritySlider from './dream-clarity-slider'
const props = defineProps({
  modelValue: { type: Number, default: 2 },
  min: { type: Number, default: 1 },
  max: { type: Number, default: 10 },
  step: { type: Number, default: 1 },
  title: { type: String, default: '梦境清晰度' },
  startLabel: { type: String, default: '🌫 朦胧' },
  endLabel: { type: String, default: '✨ 清晰' }
})
const emit = defineEmits(['update:modelValue', 'commit'])
const host = ref(null)
let root
function render() {
  root?.render(createElement(DreamClaritySlider, {
    min: props.min, max: props.max, step: props.step,
    title: props.title, startLabel: props.startLabel, endLabel: props.endLabel,
    value: props.modelValue,
    onValueChange: value => emit('update:modelValue', value),
    onValueCommit: value => emit('commit', value)
  }))
}
onMounted(() => { root = createRoot(host.value); render() })
watch(() => [props.modelValue, props.min, props.max, props.step, props.title, props.startLabel, props.endLabel], render)
onBeforeUnmount(() => { root?.unmount(); root = null })
</script>
<template><div ref="host" class="clarity-bridge" /></template>
<style scoped>
.clarity-bridge { min-width: 0; }
</style>
