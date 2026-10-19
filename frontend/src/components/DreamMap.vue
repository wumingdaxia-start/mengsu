<script setup>
import { computed, ref } from 'vue'
import { emotionColor } from '../constants'

const props = defineProps({
  data: { type: Object, default: null },
  compact: { type: Boolean, default: false }
})

const WIDTH = 800
const HEIGHT = props.compact ? 300 : 460
const active = ref(null)

function hash(text) {
  let value = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return Math.abs(value)
}

const places = computed(() => props.data?.places || [])

const nodes = computed(() => {
  const list = places.value
  const count = Math.max(list.length, 1)
  const maxRadius = props.compact ? 96 : 150
  const centerX = WIDTH / 2
  const centerY = HEIGHT / 2 + (props.compact ? 0 : 10)
  const maxCount = Math.max(...list.map((item) => item.count), 1)
  return list.map((place, index) => {
    const angle = index * 2.399963 + (hash(place.name) % 100) / 400
    const radius = Math.sqrt((index + 0.6) / count) * maxRadius
    const jitter = (hash(place.name) % 26) - 13
    return {
      ...place,
      x: centerX + Math.cos(angle) * (radius + jitter),
      y: centerY + Math.sin(angle) * (radius + jitter) * 0.72,
      dot: 5 + (place.count / maxCount) * 9
    }
  })
})

const nodeIndex = computed(() => {
  const map = {}
  nodes.value.forEach((node) => {
    map[node.name] = node
  })
  return map
})

const links = computed(() =>
  (props.data?.edges || []).filter((edge) => nodeIndex.value[edge.source] && nodeIndex.value[edge.target])
)

const stars = computed(() =>
  Array.from({ length: props.compact ? 34 : 64 }, (_, index) => {
    const seed = hash(`star-${index}`)
    return {
      x: (seed % WIDTH) + ((seed >> 8) % 7) * 0.4,
      y: ((seed >> 4) % HEIGHT) + ((seed >> 12) % 5) * 0.3,
      r: 0.6 + ((seed >> 6) % 12) / 10,
      delay: ((seed >> 3) % 40) / 10
    }
  })
)

function pick(node) {
  active.value = active.value?.name === node.name ? null : node
}
</script>

<template>
  <div class="map" :class="{ compact }">
    <svg :viewBox="`0 0 ${WIDTH} ${HEIGHT}`" class="map-svg">
      <defs>
        <radialGradient id="mapFog" cx="22%" cy="18%" r="70%">
          <stop offset="0%" stop-color="#7f7ea7" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#7f7ea7" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="mapGlow" cx="78%" cy="82%" r="70%">
          <stop offset="0%" stop-color="#5aa4d2" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#5aa4d2" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="mapSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#04060f" />
          <stop offset="55%" stop-color="#0d1733" />
          <stop offset="100%" stop-color="#1b2450" />
        </linearGradient>
        <radialGradient id="lanternGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#b7e0fc" stop-opacity="0.55" />
          <stop offset="60%" stop-color="#5aa4d2" stop-opacity="0.16" />
          <stop offset="100%" stop-color="#5aa4d2" stop-opacity="0" />
        </radialGradient>
      </defs>

      <rect :width="WIDTH" :height="HEIGHT" fill="url(#mapSky)" />
      <rect :width="WIDTH" :height="HEIGHT" fill="url(#mapFog)" />
      <rect :width="WIDTH" :height="HEIGHT" fill="url(#mapGlow)" />

      <circle
        v-for="(star, index) in stars"
        :key="`s${index}`"
        :cx="star.x"
        :cy="star.y"
        :r="star.r"
        fill="#dceafc"
        class="map-star"
        :style="{ animationDelay: `${star.delay}s` }"
      />

      <g v-for="(link, index) in links" :key="`l${index}`">
        <line
          :x1="nodeIndex[link.source].x"
          :y1="nodeIndex[link.source].y"
          :x2="nodeIndex[link.target].x"
          :y2="nodeIndex[link.target].y"
          class="map-link"
          :style="{ animationDelay: `${(index % 6) * 0.6}s` }"
        />
        <line
          :x1="nodeIndex[link.source].x"
          :y1="nodeIndex[link.source].y"
          :x2="nodeIndex[link.target].x"
          :y2="nodeIndex[link.target].y"
          class="map-link-light"
          :style="{ animationDelay: `${(index % 6) * 0.9}s` }"
        />
      </g>

      <g
        v-for="(node, index) in nodes"
        :key="node.name"
        class="map-node-group"
        :class="{ on: active?.name === node.name }"
        :style="{ animationDelay: `${(index % 8) * 0.4}s` }"
        @click="pick(node)"
      >
        <circle :cx="node.x" :cy="node.y" r="30" fill="url(#lanternGlow)" class="map-halo" />
        <line :x1="node.x" :y1="node.y" :x2="node.x" :y2="node.y - 22" class="map-thread" />
        <circle
          :cx="node.x"
          :cy="node.y"
          :r="node.dot"
          :fill="emotionColor(node.emotion)"
          class="map-node"
        />
        <text :x="node.x" :y="node.y + 22" text-anchor="middle" class="map-label">{{ node.name }}</text>
      </g>
    </svg>

    <div v-if="active" class="map-pop">
      <p class="map-pop-title">{{ active.name }}</p>
      <p class="muted small">
        出现 {{ active.count }} 次 · 最近 {{ active.last_date }} ·
        {{ active.emotion || '未标注情绪' }}
      </p>
      <button class="link" @click="active = null">收起</button>
    </div>
    <p v-else-if="!places.length" class="map-empty">记录带地点标签的梦境后，这里会亮起灯。</p>
  </div>
</template>
