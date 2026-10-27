<script setup>
import { computed, reactive, ref } from 'vue'
import { requireLogin } from '../auth'

defineProps({ section: String })
const vision = reactive({ mode: 'idle', date: new Date().toLocaleDateString('sv-SE'), distance: 200, calibration: 190, correction: '裸眼', eye: 'left', level: 0, trial: 0, correct: 0, passed: 0, result: null, round: 0, matches: 0 })
const status = ref('')
const challenges = ['每小时起身活动', '今天规律饮水', '散步二十分钟', '睡前放下屏幕']
const challengeNotes = ['久坐之后，让身体换个姿态', '分多次，慢慢喝够水', '出门走走，让心流动起来', '把夜晚还给睡眠']
const tideFriends = [{name:'小潮',avatar:'小',count:4,tide:'满潮中',color:'#a396e4'},{name:'阿澈',avatar:'阿',count:3,tide:'潮水渐涨',color:'#8caceb'},{name:'云栖',avatar:'云',count:2,tide:'泛起涟漪',color:'#7d91e6'},{name:'木南',avatar:'木',count:1,tide:'心潮初起',color:'#b9aaf0'}]
const ripplesSent = ref([])
async function inviteFriend() {
  try { await navigator.clipboard.writeText(window.location.origin + '/entry'); status.value = '邀请链接已复制，可发送给好友；好友联动功能暂未接入' }
  catch { status.value = '邀请入口：' + window.location.origin + '/entry；好友联动功能暂未接入' }
}
function sendRipple(name) { if (!ripplesSent.value.includes(name)) ripplesSent.value.push(name); status.value = '已为' + name + '点亮演示涟漪，尚未发送给真实用户' }
const challengeIcons = ['M13 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4M10 21l2-7 3 3 1 4M7 12l4-4 4 3 4 1M11 8l-1 6-4 4', 'M12 3C10 7 6 11 6 15a6 6 0 0 0 12 0c0-4-4-8-6-12Z', 'M19 4C9 3 4 8 5 16c8 2 14-3 14-12ZM5 20l10-11', 'M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11Z']
const completed = ref([])
const records = ref([])
const levels = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.2]
const directions = ['up', 'right', 'down', 'left']
const colors = [['#d86e75', '#5b8f78', '#6381b0'], ['#cd9254', '#9c6db1', '#5e9999'], ['#6a9a75', '#b47a6d', '#7687b6'], ['#ab7eae', '#6c9c9c', '#c49a5a'], ['#698bad', '#a6a565', '#bf7c8a'], ['#c28765', '#758fb6', '#90a077']]
const today = new Date().toLocaleDateString('sv-SE')
const count = computed(() => completed.value.length)
const level = computed(() => levels[vision.level])
const optotypeSize = computed(() => 2 * vision.distance * 10 * Math.tan((5 / 60 * Math.PI / 180) / 2) / level.value * (vision.calibration / 50))
try {
  const old = JSON.parse(localStorage.getItem('mengsu-vision-record') || 'null')
  records.value = JSON.parse(localStorage.getItem('mengsu-vision-history') || '[]')
  if (!records.value.length && old?.left !== undefined) records.value = [{ ...old, kind: 'acuity' }]
  completed.value = JSON.parse(localStorage.getItem('mengsu-challenges-' + today) || '[]')
} catch {}

function saveChallenges() {
  if (!requireLogin()) { completed.value = JSON.parse(localStorage.getItem('mengsu-challenges-' + today) || '[]'); return }
  try { localStorage.setItem('mengsu-challenges-' + today, JSON.stringify(completed.value)); status.value = '已保存今日打卡' }
  catch { status.value = '保存失败，请检查浏览器存储设置' }
}
function startAcuity() { Object.assign(vision, { mode: 'setup', eye: 'left', level: 0, trial: 0, correct: 0, passed: 0, result: null }) }
function beginAcuity() { vision.mode = 'acuity'; nextOptotype() }
function nextOptotype() { vision.direction = directions[Math.floor(Math.random() * directions.length)] }
function answer(direction) {
  if (direction === vision.direction) vision.correct++
  vision.trial++
  if (vision.trial < 3) return nextOptotype()
  if (vision.correct >= 2) vision.passed = level.value
  if (vision.correct >= 2 && vision.level < levels.length - 1) {
    vision.level++; vision.trial = 0; vision.correct = 0; return nextOptotype()
  }
  if (vision.eye === 'left') { vision.left = vision.passed; vision.eye = 'right'; vision.level = 0; vision.trial = 0; vision.correct = 0; vision.passed = 0; vision.mode = 'acuity'; return nextOptotype() }
  vision.result = { kind: 'acuity', left: vision.left, right: vision.passed, date: today, correction: vision.correction, distance: vision.distance }
  vision.mode = 'result'
}
function startAstigmatism() { vision.left = ''; vision.right = ''; vision.mode = 'astigmatism' }
function startColor() { vision.round = 0; vision.matches = 0; vision.mode = 'color' }
function answerColor(color) {
  if (color === vision.target) vision.matches++
  vision.round++
  if (vision.round === 6) { vision.result = { kind: 'color', correct: vision.matches, total: 6, date: today }; vision.mode = 'result'; return }
  setColorTarget()
}
function setColorTarget() { const set = colors[vision.round]; vision.target = set[Math.floor(Math.random() * set.length)]; vision.options = [...set].sort(() => Math.random() - .5) }
function startColorTest() { vision.round = 0; vision.matches = 0; setColorTarget(); vision.mode = 'color' }
function finishAstigmatism(event) {
  event.preventDefault()
  vision.result = { kind: 'astigmatism', left: vision.left, right: vision.right, date: today }
  vision.mode = 'result'
}
function saveResult() {
  if (!requireLogin()) return
  try {
    records.value.unshift({ ...vision.result })
    localStorage.setItem('mengsu-vision-history', JSON.stringify(records.value))
    localStorage.setItem('mengsu-vision-record', JSON.stringify(vision.result))
    status.value = '已保存到本机浏览器'
    vision.mode = 'idle'
  } catch { status.value = '保存失败，请检查浏览器存储设置' }
}
function removeRecord(index) {
  if (!requireLogin()) return
  records.value.splice(index, 1)
  try { localStorage.setItem('mengsu-vision-history', JSON.stringify(records.value)) }
  catch { status.value = '删除失败，请检查浏览器存储设置' }
}
function label(kind) { return ({ acuity: 'E 字视力自测', astigmatism: '散光线条观察', color: '颜色辨别练习' })[kind] }
function value(number) { return number === 0 ? '低于 0.1' : number === 1.2 ? '≥ 1.2' : Number(number).toFixed(1) }

const radialLines = Array.from({ length: 12 }, (_, i) => i * 15)
</script>

<template>
  <section class="wellness-tool" :class="{ 'challenge-page': section !== 'vision' }">
    <template v-if="section === 'vision'">
      <h1>视力检测</h1>
      <p>清晰度自测、线条观察与颜色练习，记录每次主观变化。</p>
      <p class="notice">网页测试受屏幕、距离、光线和操作影响，仅供日常参考，不能用于配镜或诊断。突发视力下降、眼痛或闪光感，请及时就医。</p>
      <div v-if="vision.mode === 'idle'" class="vision-content">
        <h2>选择检测项目</h2>
        <div class="vision-options">
          <article><span class="vision-icon">E</span><h3>E 字视力自测</h3><p>校准屏幕后，分别观察左右眼视标开口方向。</p><button @click="startAcuity">开始自测</button></article>
          <article><span class="vision-icon">✳</span><h3>散光线条观察</h3><p>比较各方向线条的清晰度与深浅，记录个人感受。</p><button @click="startAstigmatism">开始观察</button></article>
          <article><span class="vision-icon">◉</span><h3>颜色辨别练习</h3><p>完成六次色块匹配练习，不作为色觉筛查结果。</p><button @click="startColorTest">开始练习</button></article>
        </div>
        <h2>我的视力记录 <small>{{ records.length }} 条</small></h2>
        <div v-for="(item, index) in records" :key="index" class="vision-record">
          <div><b>{{ label(item.kind) }}</b><small>{{ item.date }}</small></div>
          <span v-if="item.kind === 'acuity'">左眼 {{ value(item.left) }} · 右眼 {{ value(item.right) }}</span>
          <span v-else-if="item.kind === 'astigmatism'">左眼 {{ item.left }} · 右眼 {{ item.right }}</span>
          <span v-else>匹配正确 {{ item.correct }} / {{ item.total }}</span>
          <button class="quiet" @click="removeRecord(index)">删除</button>
        </div>
      </div>

      <div v-else-if="vision.mode === 'setup'" class="test-panel">
        <header class="test-heading"><div><span class="eyebrow">EYE TEST / 准备</span><h2>E 字视力自测</h2></div><button class="quiet" @click="vision.mode = 'idle'">返回</button></header>
        <p class="setup-intro">请保持正常浏览器缩放，调好屏幕亮度并关闭夜间滤色。先完成屏幕校准，再按设定距离测试。</p>
        <div class="setup-layout">
          <div class="setup-fields">
            <section class="setup-block">
              <div class="setup-block-title"><span>01</span><div><b>校准屏幕</b><small>用实体直尺将线段调至 5 厘米</small></div></div>
              <input class="calibration-range" v-model.number="vision.calibration" type="range" min="120" max="300" aria-label="调整校准线段">
              <span class="ruler" :style="{ width: vision.calibration + 'px' }">5 厘米</span>
            </section>
            <section class="setup-block">
              <div class="setup-block-title"><span>02</span><div><b>设置测试条件</b><small>测试途中请保持相同距离和佩戴方式</small></div></div>
              <div class="form-row"><label>眼睛到屏幕距离<select v-model.number="vision.distance"><option :value="200">2 米（推荐）</option><option :value="100">1 米</option><option :value="300">3 米</option></select></label><label>测试方式<select v-model="vision.correction"><option>裸眼</option><option>佩戴眼镜</option></select></label></div>
            </section>
          </div>
          <aside class="setup-guide"><h3>测试流程</h3><ol><li>遮住右眼，先测左眼</li><li>遮住左眼，再测右眼</li><li>每级辨认 3 次，答对 2 次进入下一级</li></ol><p>遮眼时不要压迫眼球。测试时请保持距离和眼镜状态不变。</p></aside>
        </div>
        <label class="check"><input v-model="vision.calibrated" type="checkbox"><span>我已完成屏幕校准，并会保持测试距离</span></label>
        <button class="start-test" :disabled="!vision.calibrated" @click="beginAcuity">开始测试</button>
      </div>

      <div v-else-if="vision.mode === 'acuity'" class="test-panel centered">
        <span class="eyebrow">E 字视力自测 · {{ vision.eye === 'left' ? '左眼' : '右眼' }} · {{ vision.trial + 1 }} / 3</span>
        <h2>遮住{{ vision.eye === 'left' ? '右' : '左' }}眼，用{{ vision.eye === 'left' ? '左' : '右' }}眼看</h2>
        <p>距离 {{ vision.distance / 100 }} 米 · {{ vision.correction }} · 当前级别 {{ value(level) }}</p>
        <div class="optotype"><svg :width="optotypeSize" :height="optotypeSize" viewBox="0 0 5 5" role="img" aria-label="请辨认 E 字开口方向"><g :transform="`rotate(${{ up: 270, right: 0, down: 90, left: 180 }[vision.direction]} 2.5 2.5)`"><path d="M0 0H5V1H1V2H5V3H1V4H5V5H0Z" fill="#111"/></g></svg></div>
        <p>E 字开口朝向哪里？</p>
        <div class="directions"><button v-for="d in directions" :key="d" :aria-label="d" @click="answer(d)">{{ { up: '↑', right: '→', down: '↓', left: '←' }[d] }}</button></div>
        <button class="quiet" @click="answer(null)">看不清 / 不确定</button>
      </div>

      <div v-else-if="vision.mode === 'astigmatism'" class="test-panel centered">
        <button class="quiet back" @click="vision.mode = 'idle'">返回</button><h2>散光线条观察</h2>
        <p>舒适阅读距离下分别遮盖一只眼，注视中心并比较各方向线条。主观观察不代表散光度数。</p>
        <svg class="radial" viewBox="0 0 280 280" role="img" aria-label="放射状观察线"><circle cx="140" cy="140" r="128" fill="none" stroke="#ddd"/><line v-for="angle in radialLines" :key="angle" x1="140" y1="16" x2="140" y2="264" :transform="`rotate(${angle} 140 140)`" stroke="#222" stroke-width="2"/><circle cx="140" cy="140" r="4"/></svg>
        <form class="form-row" @submit="finishAstigmatism"><label>左眼感受<select v-model="vision.left" required><option value="">请选择</option><option>各方向大致均匀</option><option>部分方向更深或模糊</option><option>不确定</option></select></label><label>右眼感受<select v-model="vision.right" required><option value="">请选择</option><option>各方向大致均匀</option><option>部分方向更深或模糊</option><option>不确定</option></select></label><button>完成观察</button></form>
      </div>

      <div v-else-if="vision.mode === 'color'" class="test-panel centered">
        <span class="eyebrow">颜色辨别练习 · {{ vision.round + 1 }} / 6</span><h2>哪一块与目标颜色相同？</h2>
        <p>关闭护眼滤色、夜间模式和有色镜片。普通屏幕未经色彩校准，此练习不能判断色盲或色弱。</p>
        <div class="color-target" :style="{ background: vision.target }" aria-label="目标色块"></div>
        <div class="swatches"><button v-for="(color, i) in vision.options" :key="i" :style="{ background: color }" :aria-label="'颜色选项 ' + (i + 1)" @click="answerColor(color)"></button></div>
        <button class="quiet" @click="answerColor(null)">无法分辨</button>
      </div>

      <div v-else-if="vision.mode === 'result'" class="test-panel centered">
        <span class="eyebrow">本次体验已完成</span><h2>{{ label(vision.result.kind) }}结果</h2>
        <div v-if="vision.result.kind === 'acuity'" class="result-values"><div>左眼<b>{{ value(vision.result.left) }}</b></div><div>右眼<b>{{ value(vision.result.right) }}</b></div></div>
        <p v-else-if="vision.result.kind === 'astigmatism'">左眼：{{ vision.result.left }}；右眼：{{ vision.result.right }}。观察感受不能替代专业验光。</p>
        <p v-else>本次匹配正确 {{ vision.result.correct }} / {{ vision.result.total }}。不能据此排除色觉异常。</p>
        <button @click="saveResult">保存到本机记录</button><button class="quiet" @click="vision.mode = 'idle'">暂不保存</button>
      </div>
      <p role="status">{{ status }}</p>
    </template>
    <template v-else>
      <div class="challenge-waves" aria-hidden="true"><svg viewBox="0 0 1200 220" preserveAspectRatio="none"><path d="M0 75Q150 5 300 80T600 90T900 110T1200 65V220H0Z" fill="#cbc4f0"/><path d="M0 110Q160 180 350 125T700 100T1200 90V220H0Z" fill="#b8c6ee" opacity=".65"/><path d="M0 150Q190 60 420 145T850 140T1200 70V220H0Z" fill="#b8b5ed" opacity=".65"/></svg></div>
      <header class="challenge-heading"><h1>健康挑战赛</h1><p>按照自己的节奏，从一件小事开始。</p></header>
      <div class="challenge-orbit" role="status" :aria-label="'今日已完成 ' + count + ' 项，共 4 项'">
        <div class="challenge-ring"><div><strong>{{ count }}<small>/4</small></strong><span>今日心潮</span><small>{{ ['还很平静','心潮初起','泛起涟漪','潮水渐涨','满潮中'][count] }}</small></div></div>
      </div>
      <div class="challenge-cards"><label v-for="(item, index) in challenges" :key="item" :class="{done: completed.includes(item)}"><div class="challenge-card-top"><input v-model="completed" :value="item" type="checkbox" @change="saveChallenges"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path :d="challengeIcons[index]"/></svg></div><strong>{{ item }}</strong><p>{{ challengeNotes[index] }}</p><small>{{ completed.includes(item) ? '已完成' : '等待打卡' }}</small></label></div>
      <section class="friend-tides" aria-label="好友心潮演示"><div class="friend-tides-heading"><h2>好友心潮 <small>演示数据</small></h2><button class="invite-tide" @click="inviteFriend"><span aria-hidden="true">＋</span> 邀请好友</button></div><div class="friend-tides-grid"><article v-for="friend in tideFriends" :key="friend.name"><div class="tide-avatar" :style="{background:friend.color}">{{ friend.avatar }}</div><h3>{{ friend.name }}</h3><div class="tide-progress" :aria-label="friend.count + '/4'"><span :style="{transform:'scaleX(' + friend.count / 4 + ')'}"></span></div><p>{{ friend.count }}/4 · {{ friend.tide }}</p><button :disabled="ripplesSent.includes(friend.name)" @click="sendRipple(friend.name)">{{ ripplesSent.includes(friend.name) ? '已送涟漪' : '送涟漪' }}</button></article><button class="invite-tile" @click="inviteFriend"><span aria-hidden="true">＋</span><strong>邀好友一起养潮</strong></button></div></section>
      <p class="challenge-save-status" role="status">{{ status }}</p>
    </template>
  </section>
</template>

<style scoped>
.wellness-tool{max-width:1120px;color:#4b4c4b}.wellness-tool h1{font:600 27px var(--display)}.wellness-tool>p{color:#747774;font-size:14px;line-height:1.75}.notice{padding:12px 14px;border-left:3px solid #438f91;background:#eef6f3}.vision-content,.test-panel,.challenge-list,.challenge-summary{margin-top:20px;padding:22px;border:1px solid #dfe5e1;border-radius:8px;background:#fff}.vision-content>h2,.test-panel h2{font:600 19px var(--display);margin:4px 0 18px}.vision-content>h2:not(:first-child){margin-top:30px}.vision-content h2 small{font:400 12px sans-serif;color:#767d78}.vision-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.vision-options article{padding:18px;border:1px solid #e3e8e4;border-radius:7px;display:flex;flex-direction:column;align-items:flex-start;min-height:210px}.vision-options h3{font-size:16px;margin:14px 0 6px}.vision-options p,.test-panel p{font-size:13px;color:#6d746e;line-height:1.8}.vision-options button{margin-top:auto}.vision-icon{width:36px;height:36px;display:grid;place-items:center;background:#edf5f1;color:#32797a;font-weight:700;font-size:21px}.wellness-tool button{border:1px solid #316f72;border-radius:5px;background:#377d7e;color:white;padding:9px 14px;cursor:pointer}.wellness-tool button:disabled{opacity:.5;cursor:not-allowed}.wellness-tool button.quiet{background:white;color:#4f6866;border-color:#d6dedb}.vision-record{display:grid;grid-template-columns:1fr 1.4fr auto;align-items:center;gap:15px;padding:13px 4px;border-bottom:1px solid #e6e9e7;font-size:13px}.vision-record div{display:grid;gap:5px}.vision-record small,.footnote,.empty{color:#7a817c;font-size:12px}.test-panel{max-width:760px}.test-panel label{display:grid;gap:8px;font-size:13px;color:#4f5751}.test-panel input[type=range]{width:min(100%,300px);accent-color:#387f7d}.test-panel select{padding:9px;border:1px solid #d4dcd6;border-radius:5px;background:#fff;color:#333}.ruler{height:25px;border-bottom:2px solid #397e7c;display:flex;justify-content:center;font-size:11px;color:#5b7470;max-width:100%;overflow:hidden}.form-row{display:flex;gap:15px;align-items:end;flex-wrap:wrap;margin:16px 0}.form-row label{flex:1;min-width:200px}.check{display:flex!important;grid-template-columns:auto 1fr;align-items:center!important;margin:15px 0}.check input{accent-color:#377d7e}.centered{text-align:center}.eyebrow{font-size:11px;color:#397777}.optotype{height:250px;display:grid;place-items:center;background:white;margin:14px 0;border:1px solid #e3e8e4}.optotype span{font:900 130px Arial;line-height:1;color:#111}.directions{display:flex;justify-content:center;gap:10px;margin:14px}.directions button{width:48px;height:44px;font-size:21px;padding:0}.radial{width:min(280px,100%);margin:8px auto 20px;display:block}.radial circle:last-child{fill:#222}.color-target{width:112px;height:88px;margin:24px auto;border:5px solid white;outline:1px solid #d8dfda}.swatches{display:flex;justify-content:center;gap:12px;margin:20px}.swatches button{width:78px;height:62px;border-color:#dfe4e1}.result-values{display:flex;justify-content:center;gap:12px;margin:20px}.result-values div{min-width:120px;padding:18px;border:1px solid #dfe5e1}.result-values b{display:block;font-size:25px;color:#377d7e;margin-top:8px}.back{float:right}.challenge-list{display:grid;gap:10px}.challenge-list label{display:flex;gap:12px;align-items:center;min-height:58px;border-bottom:1px solid #eee}.challenge-list input{accent-color:#397e7c}.challenge-list small{margin-left:auto;color:#79817b}.challenge-summary{color:#397e7c}@media(max-width:700px){.vision-options{grid-template-columns:1fr}.vision-record{grid-template-columns:1fr auto}.vision-record>span{grid-column:1}.vision-record .quiet{grid-column:2;grid-row:1/3}.vision-content,.test-panel{padding:16px}}
.test-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:10px}.test-heading h2{margin:4px 0 0}.setup-intro{max-width:660px;margin:0 0 18px}.setup-block{padding:15px 16px;border:1px solid #e5e9e6;border-radius:6px;background:#fafcfb}.setup-block+.setup-block{margin-top:12px}.setup-block-title{display:flex;align-items:center;gap:11px;margin-bottom:12px}.setup-block-title>span{display:grid;place-items:center;width:25px;height:25px;background:#edf5f1;color:#397e7c;font-size:11px}.setup-block-title div{display:grid;gap:1px}.setup-block-title small{color:#7b827d;font-size:11px}.calibration-range{display:block!important;width:min(100%,320px)!important;margin:2px 0 8px;padding:0!important}.ruler{margin-top:8px}.setup-note{margin:14px 0!important}.test-panel label.check{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:10px!important;margin:14px 0!important}.test-panel label.check input[type=checkbox]{display:block;width:17px!important;height:17px;flex:0 0 17px;margin:0;accent-color:#377d7e}.test-panel label.check span{display:block;flex:1;min-width:0}.start-test{min-width:142px}.back{float:none}
.test-panel{width:100%;max-width:none}.setup-layout{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(230px,.8fr);gap:14px;align-items:stretch}.setup-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.setup-fields .setup-block+.setup-block{margin-top:0}.setup-fields .form-row{display:grid;grid-template-columns:1fr;gap:10px;margin-bottom:0}.setup-fields .form-row label{min-width:0}.setup-guide{padding:18px;border-left:2px solid #80a9a3;background:#f2f7f4}.setup-guide h3{margin:0 0 12px;font:600 15px var(--display)}.setup-guide ol{display:grid;gap:12px;margin:0;padding-left:20px;color:#4f625d;font-size:13px}.setup-guide p{margin:18px 0 0;color:#747e78;font-size:12px;line-height:1.75}@media(max-width:850px){.setup-layout{grid-template-columns:1fr}.setup-fields{grid-template-columns:1fr}.setup-fields .setup-block+.setup-block{margin-top:0}}
/* Shared lavender theme; keep test stimuli colors unchanged. */
.wellness-tool{color:#494154}
.wellness-tool>p,.vision-options p,.test-panel p{color:#827b91}
.notice{background:#f3eef9;border-left-color:#a790bd;color:#71647f}
.vision-content,.test-panel,.challenge-list,.challenge-summary{background:rgba(255,255,255,.72);border-color:#e5dfed;border-radius:16px;box-shadow:0 4px 20px rgba(88,68,112,.025)}
.vision-options article,.setup-block,.result-values div{border-color:#e5dfed;background:#f9f7fb;border-radius:12px}
.vision-icon,.setup-block-title>span{background:#eee7f5;color:#80679b;border-radius:10px}
.wellness-tool button{background:#89749f;border-color:#89749f;border-radius:10px}
.wellness-tool button:hover:not(:disabled){background:#78628f;border-color:#78628f}
.wellness-tool button.quiet{background:#f9f7fb;color:#79658c;border-color:#e5dfed}
.test-panel select{border-color:#e5dfed;color:#494154;border-radius:8px}
.test-panel input[type=range],.check input,.test-panel label.check input[type=checkbox]{accent-color:#9b82b9}
.ruler{border-color:#a790bd;color:#79658c}
.eyebrow,.result-values b,.challenge-summary{color:#80679b}
.setup-guide{background:#f3eef9;border-left-color:#a790bd}
.setup-guide ol{color:#71647f}
.vision-record{border-color:#e9e6ef}
.challenge-list label{display:grid;grid-template-columns:20px minmax(0,1fr) auto;gap:14px;align-items:center;min-height:64px;border-color:#e9e6ef;padding:10px 4px}
.challenge-list input[type=checkbox]{width:18px!important;height:18px;min-width:18px;flex:none;margin:0;padding:0;accent-color:#9b82b9;justify-self:start}
.challenge-list label>span{min-width:0;color:#625477}
.challenge-list small{margin:0;color:#9b94a6;white-space:nowrap;font-size:12px}
.challenge-summary{font-weight:600}
.wellness-tool button:focus-visible,.wellness-tool select:focus-visible{outline:2px solid #b3a3cf;outline-offset:3px}
@media(max-width:480px){.challenge-list{padding:16px}.challenge-list label{gap:10px}.challenge-list small{font-size:11px}}
</style>

<style scoped>
.challenge-page{position:relative;isolation:isolate;max-width:none;min-height:calc(100vh - 135px);padding:24px 24px 70px;overflow:hidden;background:#eeebfa;border-radius:20px;display:flex;flex-direction:column;align-items:center}
.challenge-heading{text-align:center;position:relative;z-index:1}.challenge-heading h1{margin:8px 0 8px;color:#39354f;font-size:30px}.challenge-heading p{margin:0;color:#9088ab;font-size:13px}
.challenge-orbit{width:280px;height:280px;display:grid;place-items:center;margin:24px 0;position:relative;flex-shrink:0}
.challenge-orbit:before,.challenge-orbit:after{content:'';position:absolute;inset:0;border:1px dashed #cec6ed;border-radius:50%;pointer-events:none}.challenge-orbit:after{inset:10px;border-color:#dad3ef}
.challenge-ring{width:200px;height:200px;border:1px solid #cfc6ee;border-radius:50%;background:rgba(255,255,255,.45);display:grid;place-items:center;text-align:center}
.challenge-ring>div{display:grid;gap:4px}.challenge-ring strong{font:600 56px/1.1 sans-serif;color:#37324f}.challenge-ring strong small{font-size:19px;margin-left:3px}.challenge-ring span,.challenge-ring>div>small{font-size:11px;color:#928aa8}
.challenge-cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;width:min(100%,1120px);z-index:1}
.challenge-cards label{display:block;padding:16px;background:rgba(255,255,255,.7);border:1px solid #ebe5f9;border-radius:15px;cursor:pointer;min-width:0;color:#514867;transition:background .2s cubic-bezier(.2,.7,.3,1)}
.challenge-cards label.done{background:#e5def5;border-color:#b8a7d7}.challenge-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:15px}.challenge-card-top input[type=checkbox]{width:20px!important;height:20px;margin:0;padding:0;accent-color:#9b82b9;flex:0 0 20px}.challenge-card-top svg{width:20px;height:20px;color:#b7a8df}
.challenge-cards strong{font-size:13px;display:block}.challenge-cards p{font-size:11px;color:#948aa9;margin:6px 0 12px;line-height:1.7}.challenge-cards label>small{font-size:10px;padding:3px 9px;border-radius:12px;background:#eae4f5;color:#8a79a3}.challenge-cards input:focus-visible{outline:2px solid #89749f;outline-offset:4px}
.challenge-waves{position:absolute;bottom:0;left:0;right:0;height:210px;z-index:-1;pointer-events:none}.challenge-waves svg{width:100%;height:100%;display:block}.challenge-save-status{min-height:20px;font-size:12px!important;color:#827399!important;z-index:1}
@media(max-width:700px){.challenge-page{padding:22px 16px 65px}.challenge-cards{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.challenge-orbit{width:240px;height:240px;margin:20px 0}.challenge-ring{width:180px;height:180px}.challenge-heading h1{font-size:26px}.challenge-waves{height:160px}}
</style>

<style scoped>
.challenge-cards label{padding:24px 22px;border-radius:24px}.challenge-cards strong{font-size:17px}.challenge-cards p{font-size:13px}.challenge-card-top{margin-bottom:24px}.challenge-card-top input[type=checkbox]{width:28px!important;height:28px;flex-basis:28px}.challenge-card-top svg{width:26px;height:26px}.challenge-cards label>small{font-size:12px}
.friend-tides{width:min(100%,1120px);z-index:1;margin-top:30px}.friend-tides-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px}.friend-tides-heading h2{font-size:20px;color:#39354f;margin:0}.friend-tides-heading h2 small{font-size:10px;font-weight:400;color:#928aa8;margin-left:8px}.wellness-tool .invite-tide{background:transparent;border:0;color:#8194dc;padding:6px 0;font-size:14px}.friend-tides-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}.friend-tides-grid article{text-align:center;border:1px solid #dfd9f2;background:rgba(250,248,255,.76);border-radius:22px;padding:22px 16px}.tide-avatar{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;margin:0 auto 14px;font-size:24px;font-weight:600;color:white}.friend-tides-grid h3{font-size:16px;margin:0 0 12px;color:#413956}.tide-progress{height:7px;background:#d9d3ed;border-radius:9px;overflow:hidden}.tide-progress span{display:block;width:100%;height:100%;background:linear-gradient(90deg,#a391ed,#8aa9eb);transform-origin:left;border-radius:9px}.friend-tides-grid p{font-size:12px;color:#81749c;margin:10px 0 14px}.wellness-tool .friend-tides-grid article button{padding:7px 13px;background:#dcd9f6;border:0;color:#8292d8;border-radius:20px;font-size:12px}.wellness-tool .invite-tile{border:2px dashed #d1c9ee;background:rgba(248,246,255,.4);border-radius:22px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;min-height:220px;color:#81749c}.invite-tile>span{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;background:#e3e2f8;color:#8496e1;font-size:28px}.invite-tile strong{font-size:13px}.challenge-waves{height:320px}
@media(max-width:900px){.friend-tides-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.invite-tile{grid-column:1/-1}.wellness-tool .invite-tile{min-height:130px}.challenge-cards label{padding:18px}.challenge-cards strong{font-size:14px}}
@media(max-width:480px){.challenge-cards{gap:10px}.challenge-cards label{padding:16px 12px}.challenge-cards p{font-size:11px}.friend-tides-grid{gap:10px}.friend-tides-grid article{padding:18px 12px}}
</style>
