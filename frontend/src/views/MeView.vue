<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../api'

const props = defineProps({ go: { type: Function, default: () => {} } })

const dna = ref(null)
const health = ref(null)
const reminders = ref(localStorage.getItem('mengsu-reminders') !== 'off')
const sharing = ref(localStorage.getItem('mengsu-sharing') === 'on')
const message = ref('')

async function load() {
  dna.value = await api.dna()
  health.value = await api.health()
}

function toggleReminders() {
  reminders.value = !reminders.value
  localStorage.setItem('mengsu-reminders', reminders.value ? 'on' : 'off')
  message.value = reminders.value ? '提醒已打开' : '提醒已关闭，不会再主动打扰'
}

function toggleSharing() {
  sharing.value = !sharing.value
  localStorage.setItem('mengsu-sharing', sharing.value ? 'on' : 'off')
  message.value = sharing.value
    ? '科研共享已打开，但规则没落定前不会上传任何数据'
    : '科研共享已关闭'
}

onMounted(load)
</script>

<template>
  <div class="profile-workspace">
  <section class="card profile-tendencies rise" style="--i: 0">
    <p class="card-title">梦境里的倾向</p>
      <p class="muted small">近 {{ dna?.sample || 0 }} 条记录呈现的倾向，不是标签，只作参考。</p>
      <div v-for="item in dna?.shares || []" :key="item.name" class="bar-row">
        <span class="bar-label">{{ item.name }}</span>
        <span class="bar-track">
          <span class="bar-fill accent" :style="{ width: `${item.share}%` }" />
        </span>
        <span class="muted small">{{ item.share }}%</span>
      </div>
  </section>

  <section class="card profile-privacy rise" style="--i: 1">
    <p class="card-title">提醒与隐私</p>
    <div class="row">
      <button class="ghost" @click="toggleReminders">{{ reminders ? '提醒已开' : '提醒已关' }}</button>
      <button class="ghost" @click="toggleSharing">{{ sharing ? '科研共享已开' : '科研共享已关' }}</button>
    </div>
    <p class="muted small" style="margin-top: 8px">
      记录只保存在这台电脑。密钥写在 private\.env，不进代码、不进日志、不下发到前端。
    </p>
    <p v-if="message" class="muted small">{{ message }}</p>
  </section>

  <section class="card profile-services rise" style="--i: 2">
    <p class="card-title">服务状态</p>
    <dl class="service-list">
      <div><dt>模型</dt><dd>{{ !health ? '连接中' : health.llm_ready ? '已连接' : '未配置' }}</dd></div>
      <div><dt>心潮</dt><dd>{{ !health ? '连接中' : health.xinchao_ready ? '在线' : '离线' }}</dd></div>
      <div><dt>长期记忆</dt><dd>{{ !health ? '连接中' : health.memory_ready ? '在线' : '离线' }}</dd></div>
    </dl>
  </section>

  <section class="card profile-actions rise" style="--i: 3">
    <p class="card-title">记录与陪伴</p>
    <div class="row">
      <button class="ghost" @click="props.go('capture')">写一条梦境</button>
      <button class="ghost" @click="props.go('dreams')">看全部记录</button>
      <button class="ghost" @click="props.go('ask')">去夜谭提问</button>
    </div>
  </section>
  </div>
</template>

<style scoped>
.service-list { margin: 12px 0 0; }
.service-list > div { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid var(--line); }
.service-list > div:last-child { border-bottom: 0; }
.service-list dt { color: var(--ink-soft); }
.service-list dd { margin: 0; color: var(--accent-bright); }
@media (min-width: 960px) {
  .profile-workspace { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 24px; align-items: start; }
  .profile-workspace > .card { min-width: 0; margin: 0; padding: 28px; box-shadow: none; }
  .profile-tendencies { grid-column: 1; grid-row: 1 / span 2; }
  .profile-privacy { grid-column: 2; grid-row: 1; }
  .profile-services { grid-column: 2; grid-row: 2; }
  .profile-actions { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
  .profile-actions .card-title { margin: 0; }
  .card-title { font-family: var(--display); font-size: 20px; }
  .profile-tendencies > p.small { margin: 16px 0 26px; font-size: 14px; }
  .bar-row { grid-template-columns: 80px minmax(0, 1fr) 48px; gap: 18px; padding: 14px 0; margin: 0; }
  .bar-label { font-size: 15px; }
  .profile-privacy .row { margin: 20px 0; }
}
</style>
