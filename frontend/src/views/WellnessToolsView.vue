<script setup>
import { computed, reactive, ref } from 'vue'
const props = defineProps({ section: String })
const vision = reactive({ left: '', right: '', date: new Date().toLocaleDateString('sv-SE'), note: '' })
const status = ref('')
const challenges = ['每小时起身活动', '今天规律饮水', '散步二十分钟', '睡前放下屏幕']
const completed = ref([])
try { Object.assign(vision, JSON.parse(localStorage.getItem('mengsu-vision-record') || '{}')); completed.value = JSON.parse(localStorage.getItem('mengsu-challenges-' + vision.date) || '[]') } catch {}
const count = computed(() => completed.value.length)
function saveVision() { try { localStorage.setItem('mengsu-vision-record', JSON.stringify(vision)); status.value = '已保存本机记录' } catch { status.value = '保存失败，请检查浏览器存储设置' } }
function saveChallenges() { try { localStorage.setItem('mengsu-challenges-' + new Date().toLocaleDateString('sv-SE'), JSON.stringify(completed.value)); status.value = '已保存今日打卡' } catch { status.value = '保存失败，请检查浏览器存储设置' } }
</script>
<template>
  <section class="wellness-tool">
    <template v-if="section === 'vision'">
      <h1>视力检测</h1><p>记录专业检查结果，方便下次回看。</p>
      <form @submit.prevent="saveVision"><h2>视力检查记录</h2><div class="fields"><label>检查日期<input v-model="vision.date" type="date" required /></label><label>左眼视力<input v-model="vision.left" placeholder="填写检查结果" /></label><label>右眼视力<input v-model="vision.right" placeholder="填写检查结果" /></label><label class="wide">备注<textarea v-model="vision.note" placeholder="记录用眼感受或检查备注" /></label></div><button>保存记录</button><p>屏幕无法代替标准视力检查，此处仅保存你填写的结果。</p></form>
    </template>
    <template v-else><h1>健康挑战赛</h1><p>按照自己的节奏，从一件小事开始。</p><div class="challenge-summary">今日已完成 {{ count }} / {{ challenges.length }}</div><div class="challenge-list"><label v-for="item in challenges" :key="item"><input v-model="completed" :value="item" type="checkbox" @change="saveChallenges" /><span>{{ item }}</span><small>{{ completed.includes(item) ? '已完成' : '等待打卡' }}</small></label></div></template>
    <p role="status">{{ status }}</p>
  </section>
</template>
<style scoped>
.wellness-tool{color:#5f596e}.wellness-tool h1{font:600 26px var(--display)}.wellness-tool>p{color:#888291;font-size:13px}.wellness-tool form,.challenge-list,.challenge-summary{background:#fbfafc;border:1px solid #eae6ee;border-radius:14px;padding:24px;margin-top:22px}.wellness-tool h2{font:600 19px var(--display);margin:0 0 20px}.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.fields label{display:grid;gap:7px;font-size:13px}.fields .wide{grid-column:1/-1}.fields input,.fields textarea{background:white;font-size:16px}.wellness-tool form button{margin-top:20px}.wellness-tool form p{font-size:12px;color:#92899c}.challenge-list{display:grid;gap:10px}.challenge-list label{display:flex;gap:12px;align-items:center;min-height:58px;border-bottom:1px solid #eeeaf2}.challenge-list input{width:18px;height:18px;accent-color:#9c88b5}.challenge-list small{margin-left:auto;color:#9c90ab}.challenge-summary{color:#7b698e;font-variant-numeric:tabular-nums}@media(max-width:600px){.fields{grid-template-columns:1fr}.wellness-tool form,.challenge-list,.challenge-summary{padding:18px}.challenge-list small{font-size:10px}}
</style>
