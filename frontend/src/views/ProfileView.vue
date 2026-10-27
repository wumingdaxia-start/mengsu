<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { isLoggedIn, requireLogin } from '../auth'

const key = 'mengsu-personal-profile-v1'
const blank = { name: '', gender: '', birthday: '', blood: '', height: '', weight: '', activity: '', goal: '', allergies: '', conditions: '', contact: '', phone: '' }
let stored = {}
try { stored = JSON.parse(localStorage.getItem(key) || '{}') || {} } catch {}
const profile = reactive({ ...blank, ...Object.fromEntries(Object.keys(blank).filter(k => typeof stored[k] === 'string').map(k => [k, stored[k]])) })
const saveState = ref('内容仅保存在本机')
const clearing = ref(false)
const completeness = computed(() => Math.round(Object.values(profile).filter(v => String(v).trim()).length / Object.keys(blank).length * 100))
const age = computed(() => {
  if (!profile.birthday) return ''
  const birth = new Date(profile.birthday), now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) years--
  return years >= 0 ? `${years} 岁` : ''
})
const bmi = computed(() => {
  const height = Number(profile.height), weight = Number(profile.weight)
  return height > 0 && weight > 0 ? (weight / (height / 100) ** 2).toFixed(1) : '—'
})
const today = new Date().toLocaleDateString('sv-SE')
watch(profile, () => {
  if (!isLoggedIn()) { saveState.value = '未登录，填写内容尚未保存'; return }
  try { localStorage.setItem(key, JSON.stringify(profile)); saveState.value = '已保存档案' } catch { saveState.value = '暂时无法保存，请检查浏览器存储设置' }
})
function clearProfile() { if (!requireLogin()) return; Object.assign(profile, blank); clearing.value = false }
function saveProfile() { if (!requireLogin()) return; try { localStorage.setItem(key, JSON.stringify(profile)); saveState.value = '已保存档案' } catch { saveState.value = '暂时无法保存' } }
</script>

<template>
  <div class="personal-profile">
    <section class="profile-banner" aria-label="个人健康档案摘要">
      <div class="identity"><span class="avatar">{{ profile.name.trim().slice(0, 1) || '我' }}</span><div><small>PERSONAL HEALTH FILE</small><h1>{{ profile.name || '个人健康档案' }}</h1><p>账号：{{ profile.name || '未填写' }}<template v-if="profile.gender"> · {{ profile.gender }}</template><template v-if="age"> · {{ age }}</template></p></div></div>
      <div class="completion"><div><span>档案完整度</span><strong>{{ completeness }}%</strong></div><progress :value="completeness" max="100" aria-label="档案完整度"/><p>完善资料有助于建立更清晰的个人健康记录。</p></div>
    </section>
    <div class="profile-metrics">
      <article><span>BMI</span><strong>{{ bmi }}</strong><small>基于身高体重计算</small></article>
      <article><span>身高</span><strong>{{ profile.height || '—' }}</strong><small>厘米</small></article>
      <article><span>体重</span><strong>{{ profile.weight || '—' }}</strong><small>公斤</small></article>
      <article><span>健康目标</span><strong class="goal">{{ profile.goal || '—' }}</strong><small>{{ profile.goal ? '当前记录目标' : '尚未选择' }}</small></article>
    </div>
    <form class="profile-form" @submit.prevent>
      <header><div><small>MY INFORMATION</small><h2>填写个人信息</h2><p>除登录账号外，以下内容均可修改或清空。</p></div><span role="status" class="save-state">{{ saveState }}</span><button type="button" @click="saveProfile">保存档案</button></header>
      <section class="form-section">
        <div class="section-title"><b>01</b><div><h3>基础信息</h3><p>用于识别和完善自己的健康档案</p></div></div>
        <div class="field-grid">
          <label>姓名或称呼<input v-model="profile.name" maxlength="40" autocomplete="nickname" placeholder="请输入姓名或称呼" /></label>
          <label>性别<select v-model="profile.gender"><option value="">请选择</option><option>男</option><option>女</option></select></label>
          <label>出生日期<input v-model="profile.birthday" type="date" :max="today" autocomplete="bday" /></label>
          <label>血型<select v-model="profile.blood"><option value="">不清楚</option><option>A 型</option><option>B 型</option><option>AB 型</option><option>O 型</option><option>其他</option></select></label>
        </div>
      </section>
      <section class="form-section">
        <div class="section-title"><b>02</b><div><h3>身体与习惯</h3><p>记录生活习惯，所有项目均为选填</p></div></div>
        <div class="field-grid">
          <label>身高（厘米）<input v-model="profile.height" type="number" min="30" max="300" step="0.1" placeholder="例如 172" inputmode="decimal" /></label>
          <label>体重（千克）<input v-model="profile.weight" type="number" min="1" max="700" step="0.1" placeholder="例如 65" inputmode="decimal" /></label>
          <label>日常活动水平<select v-model="profile.activity"><option value="">请选择</option><option>久坐为主</option><option>轻度活动</option><option>中等活动</option><option>高强度活动</option></select></label>
          <label>当前健康目标<select v-model="profile.goal"><option value="">请选择</option><option>改善体能</option><option>控制体重</option><option>规律作息</option><option>均衡饮食</option><option>保持状态</option></select></label>
          <label class="wide">过敏或忌口<textarea v-model="profile.allergies" rows="2" maxlength="2000" placeholder="如无可留空" /></label>
          <label class="wide">需要关注的健康情况<textarea v-model="profile.conditions" rows="3" maxlength="4000" placeholder="用于个人备忘，不代替医疗记录" /></label>
        </div>
      </section>
      <section class="form-section">
        <div class="section-title"><b>03</b><div><h3>紧急联系人</h3><p>需要时可用于快速查看</p></div></div>
        <div class="field-grid"><label>联系人姓名<input v-model="profile.contact" maxlength="80" placeholder="请输入联系人姓名" /></label><label>联系电话<input v-model="profile.phone" type="tel" maxlength="40" placeholder="请输入联系电话" /></label></div>
      </section>
      <div class="form-actions"><button v-if="!clearing" type="button" class="clear" @click="clearing = true">清空档案</button><template v-else><span>确认清空此设备保存的档案？</span><button type="button" class="clear" @click="clearProfile">确认清空</button><button type="button" @click="clearing = false">取消</button></template></div>
      <footer>个人档案仅用于本地记录与展示；BMI 等信息仅作日常参考，不能替代专业医疗建议。</footer>
    </form>
  </div>
</template>

<style scoped>
.personal-profile{color:#485467;display:grid;gap:18px;min-width:0}.profile-banner{display:flex;align-items:center;justify-content:space-between;gap:32px;padding:24px;background:linear-gradient(110deg,#f9fbfc,#eaf1ef);border:1px solid #e6eceb;border-radius:14px}.identity{display:flex;align-items:center;gap:18px;min-width:0}.avatar{display:grid;place-items:center;width:64px;height:64px;flex-shrink:0;border-radius:17px;background:#668983;color:white;font-size:28px}.identity small,.profile-form header small{font-size:9px;letter-spacing:.1em;color:#58766f}.identity h1{font:600 23px/1.4 var(--display);margin:4px 0;overflow-wrap:anywhere}.identity p,.completion p,.profile-form p{font-size:11px;color:#84908f;margin:3px 0}.completion{width:32%;min-width:200px}.completion>div{display:flex;justify-content:space-between;font-size:11px;color:#5d7a73}.completion strong{font-size:18px}.completion progress{width:100%;height:5px;appearance:none;border:0;border-radius:6px;background:#dae6e1}.completion progress::-webkit-progress-bar{background:#dae6e1;border-radius:6px}.completion progress::-webkit-progress-value{background:#71968c;border-radius:6px}.completion progress::-moz-progress-bar{background:#71968c;border-radius:6px}.profile-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.profile-metrics article{background:rgba(255,255,255,.8);border:1px solid #e8e8ed;border-radius:12px;padding:17px;display:grid;gap:5px}.profile-metrics span,.profile-metrics small{font-size:10px;color:#899193}.profile-metrics strong{font-size:25px;font-weight:600;font-variant-numeric:tabular-nums;color:#475a57}.profile-metrics .goal{font-size:19px}.profile-form{background:rgba(255,255,255,.8);border:1px solid #e8e8ed;border-radius:14px;overflow:hidden}.profile-form header{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:24px}.profile-form h2{font:600 20px/1.5 var(--display);margin:3px 0}.save-state{font-size:11px;color:#58766f;background:#eef4f1;border-radius:5px;padding:4px 8px}.form-section{display:grid;grid-template-columns:170px minmax(0,1fr);gap:24px;border-top:1px solid #edf0ef;padding:26px 24px}.section-title{display:flex;align-items:flex-start;gap:10px}.section-title b{display:grid;place-items:center;flex-shrink:0;width:28px;height:28px;font-size:10px;border-radius:7px;background:#e9f0ed;color:#6b8c81}.section-title h3{font-size:14px;margin:1px 0 5px}.section-title p{font-size:10px}.field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:19px 16px;min-width:0}.field-grid label{display:grid;gap:6px;align-content:start;font-size:12px;color:#65716e}.field-grid .wide{grid-column:1/-1}.field-grid :is(input,select,textarea){background:#fcfdfc;border:1px solid #e8ecea;border-radius:8px;font-size:14px;min-height:44px;padding:10px 12px;min-width:0;color:#495c57;box-shadow:none}.field-grid :is(input,select,textarea):focus{outline:2px solid #b6c9c3;outline-offset:1px;border-color:#a5beb5}.field-grid :is(input,textarea)::placeholder{color:#a1aaa7}.form-actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:20px 24px;border-top:1px solid #edf0ef;font-size:12px}.form-actions button{min-height:40px;padding:8px 14px;border:1px solid #e6e8e7;background:#fafbfa;color:#62736c;border-radius:8px;box-shadow:none}.form-actions .clear{color:#a57272;border-color:#eee0de;background:#fffafa}.profile-form footer{border-top:1px solid #edf0ef;font-size:10px;color:#87928e;padding:18px 24px;line-height:1.8}
.personal-profile{color:#62566f}
.profile-banner{background:linear-gradient(110deg,#fcfafb,#f0eaf6);border-color:#e9e1ef}
.avatar{background:#b09abc;color:#fff}
.identity small,.profile-form header small,.completion>div{color:#897396}
.identity p,.completion p,.profile-form p,.profile-metrics span,.profile-metrics small,.profile-form footer{color:#9b8da5}
.completion progress{background:#e9e1ef}
.completion progress::-webkit-progress-bar{background:#e9e1ef}
.completion progress::-webkit-progress-value{background:#b49ac5}
.completion progress::-moz-progress-bar{background:#b49ac5}
.profile-metrics article,.profile-form{background:rgba(255,253,255,.72);border-color:#e9e1ef}
.profile-metrics strong{color:#746180}
.save-state,.section-title b{color:#8d749f;background:#f0e9f6}
.form-section,.form-actions,.profile-form footer{border-color:#eee7f2}
.field-grid label{color:#887693}
.field-grid :is(input,select,textarea){background:#fcfaff;border-color:#e9e1f0;color:#756281;caret-color:#9c80b2}
.field-grid :is(input,select,textarea):focus{outline-color:#d4c3e2;border-color:#bca3ce;box-shadow:0 0 0 3px rgba(191,166,211,.1)}
.field-grid :is(input,textarea)::placeholder{color:#b4a7be}
.form-actions button{background:#fcfaff;border-color:#e9e1f0;color:#8a739a}
.form-actions .clear{color:#a67b93;background:#fffafd;border-color:#efdfeb}
@media(max-width:1100px){.form-section{grid-template-columns:135px minmax(0,1fr);gap:16px}}
@media(max-width:600px){.profile-banner{align-items:flex-start;flex-direction:column;gap:20px;padding:20px}.completion{width:100%;min-width:0}.profile-metrics{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.profile-metrics article{padding:14px}.profile-form header{padding:18px;align-items:flex-start;flex-direction:column;gap:10px}.form-section{grid-template-columns:1fr;padding:20px 18px;gap:18px}.field-grid{grid-template-columns:1fr;gap:15px}.field-grid :is(input,select,textarea){font-size:16px}.profile-form footer,.form-actions{padding:18px}.identity h1{font-size:21px}}
</style>
