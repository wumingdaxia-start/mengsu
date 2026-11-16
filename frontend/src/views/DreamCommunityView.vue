<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useDreamJourney } from '../composables/useDreamJourney'
import { useJourneyUi } from '../composables/useJourneyUi'
import { safetyRequest } from '../auth'
const {snapshots,refresh}=useDreamJourney(),{toast,notify}=useJourneyUi()
const posts=ref([]),publishing=ref(false),publishTopic=ref('温暖的梦')
async function community(path='',method='GET',body){const data=await safetyRequest('/api/community'+path,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});posts.value=data.posts||[]}
async function loadCommunity(){try{await community()}catch(e){notify(e.message)}}
const composing=ref(false),title=ref(''),text=ref(''),snapshotId=ref(''),comment=ref({}),expanded=ref(null),confirmDelete=ref(null)
const topic=ref('全部'),topics=['全部','轻盈的梦','温暖的梦','未说完的梦','我的分享']
const visiblePosts=computed(()=>ordered.value.filter(p=>topic.value==='全部'||(topic.value==='我的分享'?p.mine:p.topic===topic.value)))
const ordered=computed(()=>posts.value.slice())
async function publish(){if(publishing.value)return;if(!title.value.trim()||!text.value.trim())return notify('先留一个标题和愿意分享的片段');const s=snapshots.value.find(x=>String(x.id)===snapshotId.value);publishing.value=true;try{await community('','POST',{title:title.value.trim(),text:text.value.trim(),image:s?.image||'',tags:s?.tags||[],topic:publishTopic.value});composing.value=false;title.value='';text.value='';snapshotId.value='';notify('已发布到社区，其他访客现在也可以看到')}catch(e){notify(e.message)}finally{publishing.value=false}}
function attach(){const s=snapshots.value.find(x=>String(x.id)===snapshotId.value);if(s){title.value=s.title;text.value=s.signal||s.coreReport?.inner||''}}
async function like(post){try{await community('/'+post.id+'/like','POST',{});window.dispatchEvent(new Event('community-favorites-change'))}catch(e){notify(e.message)}}
async function addComment(post){const value=comment.value[post.id]?.trim();if(!value)return notify('先写一句温柔的回应');try{await community('/'+post.id+'/comments','POST',{text:value});comment.value[post.id]=''}catch(e){notify(e.message)}}
async function remove(){try{await community('/'+confirmDelete.value,'DELETE',{});confirmDelete.value=null;notify('已移除分享，梦库原作仍然保留')}catch(e){notify(e.message)}}
let timer
onMounted(()=>{refresh();loadCommunity();timer=setInterval(()=>{if(document.visibilityState==='visible')loadCommunity()},15000)})
onUnmounted(()=>clearInterval(timer))
</script>
<template>
<div class="journey">
 <p class="j-notice"><span class="j-dot"></span>社区分享 · 主动发布的内容可供其他访客查看，梦库原作仍保存在你的账号中。</p>
 <section class="j-panel community-header"><div><h2>让愿意分享的梦，有人轻轻接住</h2><p>尊重彼此的感受，不作解梦、诊断或吉凶判断。</p></div><button class="j-primary" @click="composing=!composing">{{composing?'收起编辑':'分享一束微光'}}</button></section>
 <section v-if="composing" class="j-panel"><h3>由你决定，分享多少</h3><label>从梦库带入（可选）<select v-model="snapshotId" @change="attach"><option value="">不关联快照</option><option v-for="s in snapshots" :key="s.id" :value="String(s.id)">{{s.title}}</option></select></label><div class="j-grid j-section-gap"><label>标题<input v-model="title" maxlength="60" placeholder="昨夜的一点微光"></label><div class="j-help">分享前请移除不愿公开的个人资料。发布后所有访客都能看到这段内容。</div></div><label class="j-section-gap">分享话题<select v-model="publishTopic"><option>轻盈的梦</option><option>温暖的梦</option><option>未说完的梦</option></select></label><label class="j-section-gap">片段<textarea v-model="text" rows="4" maxlength="2000" placeholder="留一段自己愿意分享的梦…"></textarea></label><button class="j-primary j-section-gap" @click="publish":disabled="publishing" >{{publishing?'正在发布…':'发布到社区'}}</button></section>
 <section class="community-board j-panel j-section-gap"><header class="community-topics"><h3>社区里的微光</h3><div class="j-tabs" role="group" aria-label="浏览梦境话题"><button v-for="t in topics" :key="t" :aria-pressed="topic===t" :class="{'j-selected':topic===t}" @click="topic=t">{{t}}</button></div><small>看看大家分享的梦，也可以在「我的分享」里管理自己的内容。</small></header>
 <div v-if="visiblePosts.length" class="community-feed"><article v-for="p in visiblePosts" :key="p.id" class="j-panel"><div class="j-between"><span class="j-tag">{{p.mine?'我的分享':p.author}}</span><small>{{p.date}}</small></div><h2 class="j-section-gap">{{p.title}}</h2><img v-if="p.image" :src="p.image" alt="帖子附带的梦境画面" class="j-art"><p class="j-prose">{{p.text}}</p><div v-if="p.tags?.length" class="community-post-tags" aria-label="梦境标签"><span v-for="tag in p.tags" :key="tag" class="j-tag">{{tag}}</span></div><div class="j-row"><button :aria-pressed="p.liked" :class="{'j-selected':p.liked}" @click="like(p)"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 20 4 12C-2 5 7 0 12 7c5-7 14-2 8 5Z"/></svg>{{p.likeCount}}</button><button @click="expanded=expanded===p.id?null:p.id">回应 {{p.comments.length}}</button><button v-if="p.mine && topic==='我的分享'" @click="confirmDelete=p.id">删除</button></div><div v-if="expanded===p.id" class="j-section-gap"><p v-for="c in p.comments" :key="c.id" class="community-comment"><small>{{c.author}} · {{c.date}}</small><br>{{c.text}}</p><label>留一句回应<input v-model="comment[p.id]" maxlength="300" placeholder="只交流感受，不给梦下结论" @keyup.enter="addComment(p)"></label><button class="j-small-action j-section-gap" @click="addComment(p)">留下回应</button></div></article></div>
 <div v-else class="j-empty community-empty"><img src="/dream-rooms/garden.png" alt="安静的梦境花园"><h3>{{topic==='我的分享'?'你还没有发布梦境':topic==='全部'?'还没有人发布梦境':'这个话题下还没有分享'}}</h3><p>用户发布后会显示在这里。你也可以从梦库选择作品，分享愿意公开的片段。</p><button @click="composing=true">写一段愿意分享的梦</button></div>
 </section>
 <Teleport to="body"><div v-if="confirmDelete" class="journey j-modal-mask" @click.self="confirmDelete=null" @keydown.esc="confirmDelete=null"><section class="j-modal" role="alertdialog" aria-modal="true" aria-label="确认移除帖子"><h2>要移除这束分享吗？</h2><p>会删除这条公开分享及其回应，梦库里的原快照仍然保留。</p><div class="j-row"><button autofocus @click="confirmDelete=null">保留</button><button @click="remove">确认移除</button></div></section></div></Teleport><div v-if="toast" class="j-toast" role="status">{{toast}}</div>
</div>
</template>
<style scoped>.community-header{display:flex;justify-content:space-between;align-items:center;gap:22px}.community-feed{max-width:920px;display:grid;gap:22px}.community-feed>.j-panel{margin:0}.community-comment{padding:12px 15px;border-radius:12px;background:#f5f1f9;white-space:pre-wrap;overflow-wrap:anywhere}.community-feed .j-art{max-height:400px;object-fit:contain;background:#f2eef6}@media(max-width:600px){.community-header{align-items:flex-start;flex-direction:column}}.community-board{display:grid;gap:22px;min-width:0}.community-topics h3{margin:0 0 16px}.community-topics small{display:block;line-height:1.7}.community-board .community-feed{width:100%;max-width:none;margin:0}.community-board .community-empty{margin:0;padding:30px 20px}.community-board .community-empty img{display:none}.community-board .community-empty h3{margin-top:0}
.community-post-tags{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 20px}.community-post-tags .j-tag{border:1px solid #dacee6;border-radius:20px;padding:6px 12px;background:#ece4f3;color:#5f4c73;overflow-wrap:anywhere;max-width:100%}
.community-feed .j-prose{max-width:none;width:100%;font-size:15px;line-height:1.85;letter-spacing:normal;white-space:pre-wrap;overflow-wrap:anywhere;text-align:left}
</style>

<style scoped>
.community-examples{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;margin-top:22px}.community-examples .example-card{margin:0;padding:0;overflow:hidden}.example-card>img{width:100%;height:180px;display:block;object-fit:cover}.example-copy{padding:24px}.example-copy h3{margin:16px 0 10px}.example-copy>p{font-size:14px;line-height:1.9}.example-question{padding-top:14px;border-top:1px solid var(--j-line);color:var(--j-muted)}.community-topics .j-tabs{margin-bottom:8px}@media(max-width:760px){.community-examples{grid-template-columns:1fr}.example-copy{padding:20px}.example-card>img{height:160px}}
</style>
