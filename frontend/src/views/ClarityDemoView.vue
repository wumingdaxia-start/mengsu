<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import DreamClarityDemo from '../components/dream-clarity-demo'
const host = ref(null)
let root
onMounted(() => { root = createRoot(host.value); root.render(createElement(DreamClarityDemo)) })
onBeforeUnmount(() => root?.unmount())
</script>
<template><div ref="host" /></template>
