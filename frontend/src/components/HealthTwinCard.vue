<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
const props = defineProps({ notes: { type: Number, default: 0 }, sleep: { type: Number, default: 0 }, dreams: { type: Number, default: 0 } })
const router = useRouter()
const twinStyle = ref('male')
const selectedAreas = ref([])
const bodyAreas = [
  { id: 'head', label: '头部', side: 'left', top: '10%' },
  { id: 'neck', label: '颈部', side: 'left', top: '18%' },
  { id: 'shoulder', label: '肩部', side: 'right', top: '21%' },
  { id: 'chest', label: '胸部', side: 'left', top: '31%' },
  { id: 'abdomen', label: '腹部', side: 'right', top: '41%' },
  { id: 'legs', label: '腿部', side: 'left', top: '58%' },
  { id: 'feet', label: '脚部', side: 'right', top: '76%' }
]
function toggleArea(id) {
  selectedAreas.value = selectedAreas.value.includes(id)
    ? selectedAreas.value.filter((area) => area !== id)
    : [...selectedAreas.value, id]
}
function recordHealthFocus() {
  const focus = bodyAreas
    .filter((area) => selectedAreas.value.includes(area.id))
    .map((area) => area.label)
  router.push({ path: '/capture', query: focus.length ? { healthFocus: focus.join('、') } : {} })
}
</script>

<template>
  <section class="twin-card" aria-labelledby="twin-title">
    <div class="twin-copy">
      <p class="twin-eyebrow">YOUR HEALTH PROFILE</p>
      <h2 id="twin-title">健康档案 · 数字孪生</h2>
      <p class="twin-description">用一个温和的数字形象，陪你回看已记录的生活状态。形象仅作档案入口，不代表身体扫描或医学测量。</p>
      <div class="twin-facts">
        <span><i class="twin-dot twin-dot-blue"></i>日间笔记 <b>{{ notes }}</b></span>
        <span><i class="twin-dot twin-dot-lilac"></i>睡眠记录 <b>{{ sleep }}</b></span>
        <span><i class="twin-dot twin-dot-pink"></i>梦境片段 <b>{{ dreams }}</b></span>
      </div>
      <button class="twin-button" type="button" @click="recordHealthFocus">{{ selectedAreas.length ? '录入健康日志' : '补充一条记录' }} <span aria-hidden="true">↗</span></button>
    </div>
    <div class="twin-figure-wrap" :aria-label="twinStyle === 'female' ? '女性数字健康形象示意图' : '男性数字健康形象示意图'">
      <div class="twin-orbit twin-orbit-one"></div><div class="twin-orbit twin-orbit-two"></div>
      <div class="twin-halo"></div>
      <div class="twin-portraits" aria-live="polite">
        <img class="twin-figure twin-portrait twin-portrait-female" :class="{ active: twinStyle === 'female' }" src="/avatars/health-avatar-female-clean.webp" alt="女性健康档案形象" width="363" height="1140" fetchpriority="high" decoding="async" />
        <img class="twin-figure twin-portrait twin-portrait-male" :class="{ active: twinStyle === 'male' }" src="/avatars/health-avatar-male-clean.webp" alt="男性健康档案形象" width="388" height="1140" decoding="async" />
      </div>
      <div class="twin-style-toggle" role="group" aria-label="选择数字形象">
        <button type="button" :class="{ selected: twinStyle === 'male' }" @click="twinStyle = 'male'">男</button>
        <button type="button" :class="{ selected: twinStyle === 'female' }" @click="twinStyle = 'female'">女</button>
      </div>
      <div class="body-area-tags" role="group" aria-label="选择要关注的身体部位">
        <button
          v-for="area in bodyAreas"
          :key="area.id"
          class="body-area-tag"
          :class="[`side-${area.side}`, { selected: selectedAreas.includes(area.id) }]"
          :style="{ '--area-top': area.top }"
          type="button"
          :aria-pressed="selectedAreas.includes(area.id)"
          @click="toggleArea(area.id)"
        >
          <span class="area-mark" aria-hidden="true"></span>{{ area.label }}<small v-if="selectedAreas.includes(area.id)">已关注</small>
        </button>
      </div>
      <p class="body-area-note" aria-live="polite">{{ selectedAreas.length ? `已关注：${bodyAreas.filter((area) => selectedAreas.includes(area.id)).map((area) => area.label).join('、')}` : '点选身体部位，记录此刻身体感受' }}</p>
      <span class="twin-caption">你的专属健康档案形象</span>
    </div>
  </section>
</template>

<style scoped>
.twin-card { width: min(100%, 1120px); margin: 0 auto 10px; display: grid; grid-template-columns: 1.05fr .95fr; align-items: center; gap: 24px; position: relative; overflow: visible; padding: clamp(18px, 2.5vw, 30px) clamp(8px, 2vw, 26px); background: transparent; }
.twin-card::before { content: ''; position: absolute; z-index: -1; width: min(60vw, 620px); height: 340px; left: 1%; top: 4px; border-radius: 50%; background: radial-gradient(ellipse at 50% 35%, rgba(255,255,255,.93), rgba(232,235,248,.42) 52%, rgba(237,231,247,0) 76%); filter: blur(8px); pointer-events: none; }
.twin-copy { position: relative; z-index: 1; order: 2; }
.twin-eyebrow { margin: 0 0 10px; color: #a08eaf; font-size: 10px; letter-spacing: .12em; }
.twin-copy h2 { margin: 0 0 10px; color: #544661; font: 500 clamp(20px, 2.4vw, 27px)/1.4 var(--display); }
.twin-description { max-width: 520px; margin: 0; color: #857990; font-size: 14px; line-height: 1.8; }
.twin-facts { display: flex; flex-wrap: wrap; gap: 9px 16px; margin-top: 18px; color: #786b84; font-size: 12px; }
.twin-facts span { display: inline-flex; align-items: center; gap: 7px; }
.twin-facts b { color: #5f526d; font-weight: 600; }
.twin-dot { width: 7px; height: 7px; border-radius: 50%; }
.twin-dot-blue { background: #9eb9d5; }.twin-dot-lilac { background: #bda9d1; }.twin-dot-pink { background: #d9a9be; }
.twin-button { display: inline-flex; align-items: center; gap: 14px; margin-top: 21px; padding: 9px 14px; border: 1px solid #ded2e8; border-radius: 999px; color: #746385; background: rgba(255,255,255,.74); font: inherit; font-size: 12px; cursor: pointer; transition: transform 180ms cubic-bezier(.2,.7,.2,1), background 180ms cubic-bezier(.2,.7,.2,1); }
.twin-button:hover { transform: translateY(-2px); background: #fff; }.twin-button span { color: #a38db5; font-size: 15px; }
.twin-figure-wrap { position: relative; display: grid; place-items: end center; min-height: 630px; isolation: isolate; order: 1; }
.twin-halo { position: absolute; z-index: -1; bottom: 17px; width: 240px; height: 260px; border-radius: 48% 52% 38% 62% / 48% 44% 56% 52%; background: radial-gradient(ellipse at 50% 45%, rgba(255,255,255,.96), rgba(218,225,243,.48) 56%, rgba(208,222,239,0) 76%); filter: blur(2px); animation: twin-breathe 7s cubic-bezier(.37,0,.63,1) infinite; }
.twin-orbit { position: absolute; animation: twin-orbit-drift 5.2s cubic-bezier(.37,0,.63,1) infinite alternate; border: 1px solid rgba(159,151,190,.24); border-radius: 50%; transform: rotate(-25deg); }
.twin-orbit-one { width: 290px; height: 110px; top: 104px; }.twin-orbit-two { width: 240px; animation-delay: -2.6s; height: 86px; top: 129px; transform: rotate(25deg); border-color: rgba(147,181,205,.3); }
.twin-portraits { position: relative; z-index: 1; width: min(495px, 125%); height: 630px; isolation: isolate; transform: translateX(-64px); }
.twin-portraits::before { content: ''; position: absolute; z-index: -1; inset: 8% -20% 0; border-radius: 50%; pointer-events: none; opacity: .74; background: radial-gradient(ellipse at 50% 78%, rgba(183,181,219,.27), rgba(226,220,241,.16) 42%, rgba(248,247,253,0) 74%); filter: blur(24px); }
.twin-figure { position: absolute; z-index: 1; inset: 0; width: 100%; height: 100%; filter: saturate(.82) contrast(.93) brightness(1.05) drop-shadow(0 16px 22px rgba(93,89,119,.08)); opacity: 0; animation: twin-portrait-drift 4.8s cubic-bezier(.37,0,.63,1) infinite; pointer-events: none; transition: opacity 180ms cubic-bezier(.23,1,.32,1); }
.twin-portrait { display: block; object-fit: contain; object-position: center bottom; border-radius: 0; mix-blend-mode: normal; }
.twin-portrait.active { opacity: .84; }
.twin-portrait-female { object-position: center 7%; }.twin-portrait-male { object-position: center 8%; }
.twin-style-toggle { position: absolute; z-index: 3; top: 12px; right: 10px; display: flex; gap: 3px; padding: 3px; border: 1px solid rgba(255,255,255,.8); border-radius: 999px; background: rgba(255,255,255,.58); backdrop-filter: blur(10px); }
.twin-style-toggle button { min-width: 31px; height: 28px; padding: 0 8px; border: 0; border-radius: 999px; color: #8a7b96; background: transparent; font: inherit; font-size: 11px; cursor: pointer; }
.twin-style-toggle button.selected { color: #fff; background: #9b86af; box-shadow: 0 3px 9px rgba(107,88,130,.16); }
.twin-caption { position: absolute; bottom: 0; color: #a194ac; font-size: 11px; letter-spacing: .04em; }
.body-area-tags { position: absolute; z-index: 4; inset: 0; pointer-events: none; }
.body-area-tag { position: absolute; top: var(--area-top); display: inline-flex; align-items: center; gap: 6px; min-height: 28px; padding: 4px 8px; border: 1px solid rgba(211,202,224,.72); border-radius: 999px; color: #857894; background: rgba(255,255,255,.84); box-shadow: 0 4px 14px rgba(110,96,132,.06); backdrop-filter: blur(8px); font: inherit; font-size: 11px; white-space: nowrap; cursor: pointer; pointer-events: auto; transition: color 180ms cubic-bezier(.23,1,.32,1), background 180ms cubic-bezier(.23,1,.32,1), border-color 180ms cubic-bezier(.23,1,.32,1), transform 180ms cubic-bezier(.23,1,.32,1); }
.body-area-tag.side-left { left: calc(50% - 224px); }.body-area-tag.side-right { left: calc(50% + 112px); }
.body-area-tag::after { content: ''; position: absolute; top: 50%; width: 19px; height: 1px; background: linear-gradient(90deg, rgba(190,174,209,.74), rgba(190,174,209,.08)); transform: translateY(-50%); pointer-events: none; }.body-area-tag::before { content: ''; position: absolute; top: 50%; width: 4px; height: 4px; border-radius: 50%; background: #c2b0d1; box-shadow: 0 0 0 3px rgba(194,176,209,.12); transform: translateY(-50%); pointer-events: none; }.body-area-tag.side-left::after { right: -19px; }.body-area-tag.side-left::before { right: -23px; }.body-area-tag.side-right::after { left: -19px; transform: translateY(-50%) rotate(180deg); }.body-area-tag.side-right::before { left: -23px; }
.body-area-tag:hover { transform: translateY(-2px); border-color: #c3afd5; background: rgba(255,255,255,.94); }
.body-area-tag.selected { border-color: #b79bcf; color: #6e587f; background: rgba(241,232,248,.94); }
.area-mark { width: 6px; height: 6px; border-radius: 50%; background: #c2b0d1; box-shadow: 0 0 0 3px rgba(194,176,209,.13); }
.body-area-tag.selected .area-mark { background: #9b79b7; box-shadow: 0 0 0 3px rgba(155,121,183,.17); }
.body-area-tag small { color: #aaa0b1; font-size: 9px; }.body-area-tag.selected small { color: #9276a7; }
.body-area-note { position: absolute; right: 50%; bottom: 23px; z-index: 4; margin: 0; color: #988da2; font-size: 10px; white-space: nowrap; transform: translateX(50%); }
@keyframes twin-float { 0%,100% { transform: translate3d(0,0,0); } 50% { transform: translate3d(0,-15px,0); } }
@keyframes twin-portrait-drift { 0%,100% { transform: translate3d(-5px,0,0) rotate(-1.2deg); } 50% { transform: translate3d(7px,-22px,0) rotate(1.2deg); } }
@keyframes twin-orbit-drift { from { translate: -9px 8px; rotate: -4deg; } to { translate: 10px -9px; rotate: 5deg; } }
@keyframes twin-breathe { 0%,100% { opacity: .72; transform: scale(.98); } 50% { opacity: 1; transform: scale(1.04); } }
@media (prefers-reduced-motion: reduce) { .twin-figure, .twin-halo, .twin-orbit { animation: none; }.twin-figure { transition-duration: 1ms; } }
@media (max-width: 700px) { .twin-card { grid-template-columns: 1fr; gap: 0; }.twin-copy { order: 1; }.twin-figure-wrap { min-height: 430px; margin-top: 10px; order: 2; }.twin-portraits { width: min(310px, 78%); height: 390px; transform: none; }.body-area-tag.side-left { left: calc(50% - 160px); }.body-area-tag.side-right { left: calc(50% + 76px); }.body-area-tag::after { width: 12px; }.body-area-tag.side-left::after { right: -12px; }.body-area-tag.side-left::before { right: -16px; }.body-area-tag.side-right::after { left: -12px; }.body-area-tag.side-right::before { left: -16px; }.body-area-note { bottom: 3px; font-size: 9px; }.twin-caption { bottom: 20px; } }
</style>



