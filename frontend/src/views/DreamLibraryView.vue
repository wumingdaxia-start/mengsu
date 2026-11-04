<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { demoDreams, downloadText, today, useDreamJourney } from '../composables/useDreamJourney'
import { useJourneyUi } from '../composables/useJourneyUi'
import { dreamReady, dreamError, retryDreamAccount } from '../dream-account'
const router = useRouter(), { snapshots, refresh, commit } = useDreamJourney(), { toast, notify, save } = useJourneyUi()
const query = ref(''), day = ref(''), kind = ref('全部'), demos = ref(false), selected = ref(null), pendingDelete = ref(null)
const month = ref(today().slice(0, 7)), modes = ['全部', '手动梦快照', '内核报告']
const source = computed(() => demos.value ? demoDreams : snapshots.value)
// Category is shared by the results and calendar; search/date narrow only the results.
const category = computed(() => source.value.filter(s => kind.value === '全部' || (kind.value === '内核报告' ? s.kind === 'core-report' : s.kind !== 'core-report')))
const countFor = mode => source.value.filter(s => mode === '全部' || (mode === '内核报告' ? s.kind === 'core-report' : s.kind !== 'core-report')).length
const view = computed(() => ({
 '全部': {title:'所有夜晚的回响', intro:'手动留下的梦快照与保存的内核报告，在这里相遇。', empty:'梦库还在等待第一束微光', help:'记下一场梦，或完成意识内核测试并保存报告，它们就会留在这里。'},
 '手动梦快照': {title:'你亲手留下的梦', intro:'回看梦里的画面、醒来体感，以及创作中留下的片段。', empty:'还没有留下梦快照', help:'趁醒来时的感受还清晰，留下一个画面或一句残留信号。'},
 '内核报告': {title:'你的梦境内核回响', intro:'这里收起意识内核测试中由你保存的报告，和梦快照分开展示。', empty:'还没有保存内核报告', help:'完成意识内核测试后，点击“保存为本场意识快照”，报告就会出现在这里。'}
}[kind.value]))
const filtered = computed(() => category.value.filter(s => (!query.value.trim() || `${s.title || ''} ${s.signal || ''} ${s.coreReport?.inner || ''}`.toLowerCase().includes(query.value.trim().toLowerCase())) && (!day.value || s.date?.slice(0, 10) === day.value)).slice().sort((a,b) => String(b.date).localeCompare(String(a.date))))
function selectKind(mode){kind.value=mode;day.value='';selected.value=null}
function toggleDemos(){demos.value=!demos.value;day.value='';query.value='';if(demos.value)month.value=demoDreams[0].date.slice(0,7)}
const calendar = computed(() => { const [y,m] = month.value.split('-').map(Number); if (!y || !m) return []; const offset = (new Date(y,m-1,1).getDay()+6)%7; return [...Array(offset).fill(null), ...Array.from({length:new Date(y,m,0).getDate()},(_,i)=>`${month.value}-${String(i+1).padStart(2,'0')}`)] })
const has = date => category.value.some(s => s.date?.slice(0,10) === date)
async function lock(s) { if(s.demo)return notify('示例快照不写入你的梦库'); await save(commit, 'snapshots', snapshots.value.map(x=>x.id===s.id?{...x,locked:!x.locked}:x), s.locked?'快照已解除锁定':'快照已锁定'); selected.value=null }
async function remove() { const s=pendingDelete.value; if(s.locked)return notify('先解除锁定，再删除快照'); if(await save(commit,'snapshots',snapshots.value.filter(x=>x.id!==s.id),'快照已从当前账号删除')){pendingDelete.value=null;selected.value=null} }
function exportLibrary(){downloadText('花屿星-梦库.json',JSON.stringify(snapshots.value,null,2),'application/json');notify('已导出当前账号梦库')}
function open(s){selected.value=s}
onMounted(refresh)
</script>
<template>
<div class="journey" @keydown.esc="selected=null;pendingDelete=null">
 <p class="j-notice"><span class="j-dot"></span>你的梦库保存在当前账号，和记梦、意识内核测试互通。</p>
 <div class="j-between j-section-gap" style="margin-bottom:24px"><div class="j-tabs" style="margin:0" role="group" aria-label="梦库内容类别"><button v-for="m in modes" :key="m" :class="{'j-selected':kind===m}" :aria-pressed="kind===m" @click="selectKind(m)">{{m}} <small>{{countFor(m)}}</small></button></div><div class="j-row"><button @click="toggleDemos">{{demos?'回到我的梦库':'浏览示例梦库'}}</button><button @click="exportLibrary">导出梦库</button><button class="j-primary" @click="router.push('/capture')">记一场梦 ↗</button></div></div>
 <section class="library-category-heading" aria-live="polite"><h2>{{view.title}}</h2><p>{{view.intro}}</p></section>
 <div class="j-wide-grid">
  <aside class="j-panel"><h2>{{kind==='内核报告'?'在日历里找回报告':'在日历里找回梦'}}</h2><label>翻到这个月<input v-model="month" type="month" aria-label="日历月份"></label><div class="library-calendar"><small v-for="w in ['一','二','三','四','五','六','日']" :key="w">{{w}}</small><template v-for="(date,i) in calendar" :key="i"><button v-if="date" :class="{'j-selected':day===date,'has-dream':has(date)}" :aria-label="date+(has(date)?'，有快照':'')" @click="day=day===date?'':date">{{Number(date.slice(-2))}}</button><span v-else></span></template></div><small>小圆点代表那天留下了{{kind==='全部'?'快照或报告':kind}}。</small><div class="j-rule"></div><label>或选一个日期<input v-model="day" type="date"></label><button v-if="day" class="j-small-action j-section-gap" @click="day=''">清除日期筛选</button><p v-if="demos" class="j-help">示例梦境在 2026 年 10 月，不会混进你的记录。</p></aside>
  <section class="j-stack"><label class="library-search"><span class="j-sr">搜索梦境</span><input v-model="query" type="search" placeholder="搜索标题或残留信号"></label><div class="j-between"><small>{{demos?'示例梦库':'我的梦库'}} · {{kind}} · {{filtered.length}} {{kind==='内核报告'?'份报告':'条回响'}}</small><small v-if="day">{{day}}</small></div>
   <div v-if="!demos && dreamError" class="j-empty" role="status"><h3>梦库暂时未能载入</h3><p>重新连接后，再查看你的快照与报告。</p><button @click="retryDreamAccount">重新载入</button></div>
   <div v-else-if="!demos && !dreamReady" class="j-empty" role="status"><p>正在接回你的夜晚回响…</p></div>
   <div v-else-if="!filtered.length" class="j-empty library-empty" role="status">
    <h3>{{query.trim()||day?'没有找到对应的'+(kind==='内核报告'?'报告':'回响'):view.empty}}</h3>
    <p>{{query.trim()||day?'试着换个词，或清除日期与搜索条件。':demos?'示例梦库只提供梦快照，内核报告由你完成测试后保存。':view.help}}</p>
    <div class="j-row"><button v-if="query.trim()||day" @click="query='';day=''">清除筛选</button><template v-else><button v-if="kind!=='内核报告'" class="j-primary" @click="router.push('/capture')">记一场梦</button><button v-if="kind!=='手动梦快照'" :class="{'j-primary':kind==='内核报告'}" @click="router.push('/dream/forgotten')">进入意识内核测试</button></template></div>
   </div>
   <article v-for="s in filtered" :key="s.id" class="j-panel library-card"><button class="library-cover" :aria-label="'打开'+s.title" @click="open(s)"><img :src="s.image||'/dream-rooms/pages.png'" :alt="s.image?'梦境画面':'纸页插画'"></button><div class="library-card-text"><div class="j-row"><small>{{s.date}}</small><span class="j-tag" :class="{'blue':s.kind==='core-report'}">{{s.kind==='core-report'?'梦境内核测试报告':s.feeling||'意识快照'}}</span><span v-if="s.locked" class="j-tag warm">已锁定</span></div><h3><button class="library-title" @click="open(s)">{{s.title}}</button></h3><p>{{s.signal||s.coreReport?.inner||'这幅快照以画面留下了回响。'}}</p><div class="j-row"><button class="j-small-action" @click="open(s)">展开快照</button><button v-if="!s.demo" class="j-small-action" @click="lock(s)">{{s.locked?'解除锁定':'锁定'}}</button><button v-if="!s.demo" class="j-small-action" @click="pendingDelete=s">删除</button></div></div></article>
  </section>
 </div>
 <Teleport to="body"><div v-if="selected" class="journey j-modal-mask" @click.self="selected=null" @keydown.esc="selected=null"><section class="j-modal" role="dialog" aria-modal="true" aria-label="快照详情" tabindex="-1"><div class="j-between"><h2>{{selected.title}}</h2><button autofocus @click="selected=null">关闭</button></div><small>{{selected.date}} · {{selected.demo?'示例素材':selected.kind==='core-report'?'内核报告':'手动梦快照'}}</small><img v-if="selected.image" class="j-art j-section-gap" :src="selected.image" alt="梦境画面"><p>{{selected.signal}}</p><template v-if="selected.coreReport"><h3>{{selected.coreReport.primary}} × {{selected.coreReport.secondary}}</h3><p>{{selected.coreReport.inner}}</p><p>{{selected.coreReport.gravity}}</p></template><div class="j-row"><button @click="router.push({path:'/dream/studio',query:{snapshot:String(selected.id)}})">带到创作工坊</button><button v-if="selected.kind==='core-report'" @click="router.push('/dream/forgotten')">进入意识内核测试</button></div></section></div><div v-if="pendingDelete" class="journey j-modal-mask" @click.self="pendingDelete=null"><section class="j-modal" role="alertdialog" aria-modal="true" aria-label="确认删除快照"><h2>要把这幅快照移出梦库吗？</h2><p>{{pendingDelete.locked?'这幅快照已锁定，请先解除锁定。':'此操作会删除当前账号中的快照。你可以先导出梦库。'}}</p><div class="j-row"><button @click="pendingDelete=null">保留快照</button><button v-if="!pendingDelete.locked" @click="remove">确认删除</button></div></section></div></Teleport>
 <div v-if="toast" class="j-toast" role="status">{{toast}}</div>
</div>
</template>
<style scoped>
.library-category-heading{margin:0 0 24px}.library-category-heading h2{margin-bottom:6px}.library-category-heading p{color:var(--j-muted);font-size:14px}.library-empty .j-row{justify-content:center}.library-empty h3{margin-top:0}.library-calendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;margin:22px 0}.library-calendar small{text-align:center}.library-calendar button{padding:5px;min-height:36px;position:relative;border-color:transparent;background:transparent;font-size:13px}.library-calendar .has-dream:after{content:'';position:absolute;bottom:2px;left:calc(50% - 2px);width:4px;height:4px;border-radius:50%;background:#a895bf}.library-card{display:flex;gap:22px;padding:18px}.library-card+.library-card{margin-top:0}.library-cover{padding:0!important;flex:0 0 135px;border-radius:15px!important;overflow:hidden}.library-cover img{width:135px;height:160px;object-fit:cover}.library-card-text{min-width:0;flex:1}.library-card-text h3{margin:6px 0}.library-title{padding:0!important;border:0!important;background:none!important;min-height:30px!important;font:inherit!important;justify-content:flex-start!important;text-align:left}.library-card-text p{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:14px}.library-search input{background:#fffdfb}.library-card{transition:transform .3s cubic-bezier(.2,.8,.2,1)}.library-card:hover{transform:translateY(-2px)}@media(max-width:540px){.library-cover{flex-basis:82px}.library-cover img{width:82px;height:130px}.library-card{gap:13px;padding:14px}.library-card-text .j-tag{font-size:10px}.library-card-text p{font-size:13px}}
</style>
