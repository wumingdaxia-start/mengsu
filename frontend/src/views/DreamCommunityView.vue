<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { today, useDreamJourney } from '../composables/useDreamJourney'
import { useJourneyUi } from '../composables/useJourneyUi'
const router=useRouter(),{posts,snapshots,refresh,commit}=useDreamJourney(),{toast,notify,save}=useJourneyUi()
const composing=ref(false),title=ref(''),text=ref(''),snapshotId=ref(''),comment=ref({}),expanded=ref(null),confirmDelete=ref(null)
const topic=ref('全部'),topics=['全部','轻盈的梦','温暖的梦','未说完的梦','我的分享']
// Curated fictional fragments are never mixed into the account's own posts.
const examples=[
 {id:'cloud',topic:'轻盈的梦',title:'云上的车站没有末班车',text:'我站在一座很轻的车站里，列车经过时没有声音。口袋里有张空白车票，我忽然觉得，不赶上这一班也没关系。',feeling:'轻失重 · 松弛',image:'/dream-library/mist-stairs.jpg',question:'醒来后，你还记得哪一种轻盈？'},
 {id:'room',topic:'温暖的梦',title:'那盏灯，一直为我亮着',text:'回到旧屋，桌上有一杯温水。看不清谁坐在窗边，只记得窗帘轻轻晃着。醒来时，手心还是暖的。',feeling:'温暖 · 安稳',image:'/dream-library/night-bedroom.jpg',question:'有没有一处梦里的地方，让你愿意多停留一会儿？'},
 {id:'snow',topic:'未说完的梦',title:'山谷替我留住一句话',text:'雪地里只有脚步声。我朝远处喊了一句什么，回声迟迟没来。等到醒来，那句话已经忘了，安静却还在。',feeling:'疏离 · 怅然',image:'/dream-library/snow-mountain.jpg',question:'梦消散后，什么感受留到了白天？'},
 {id:'forest',topic:'温暖的梦',title:'树林里有人慢慢等我',text:'每走一步，树叶就亮起一点。我不知道路通向哪里，只感觉不必独自着急。最后一束光停在肩头，像很轻的拥抱。',feeling:'被承托 · 温暖',image:'/dream-library/mist-forest.jpg',question:'用一句话，留下你此刻最想被接住的感受。'},
 {id:'water',topic:'轻盈的梦',title:'在水面上寄出一封空信',text:'纸船没有沉下去，反而一点点变成月光。我跟着它走了很远，鞋尖一直没有沾湿。醒来后，像放下了一件小事。',feeling:'漂浮 · 平静',image:'/dream-rooms/garden.png',question:'如果今晚能放下一件事，你想放下什么？'},
 {id:'door',topic:'未说完的梦',title:'门后是一场还没下完的雨',text:'推开门，雨声在很远的地方。有人把伞放在门边，没有留下名字。我没有走出去，只坐着听了一会儿。',feeling:'牵挂 · 安静',image:'/dream-library/mist-stairs.jpg',question:'不必讲完整，你想留下哪个片段？'}
]
const exampleLikes=ref([])
const visibleExamples=computed(()=>topic.value==='我的分享'?[]:examples.filter(p=>topic.value==='全部'||p.topic===topic.value))
const visiblePosts=computed(()=>topic.value==='全部'||topic.value==='我的分享'?ordered.value:[])
function beginFromExample(p){title.value=p.title+' · 我的回响';text.value='';snapshotId.value='';composing.value=true;notify('已打开分享区，可以写下你自己的感受')}
function toggleExample(p){exampleLikes.value=exampleLikes.value.includes(p.id)?exampleLikes.value.filter(id=>id!==p.id):[...exampleLikes.value,p.id]}
const ordered=computed(()=>posts.value.slice().sort((a,b)=>b.id-a.id))
async function publish(){if(!title.value.trim()||!text.value.trim())return notify('先留一个标题和愿意分享的片段');const s=snapshots.value.find(x=>String(x.id)===snapshotId.value);const post={id:Date.now(),date:today(),title:title.value.trim(),text:text.value.trim(),image:s?.image||'',liked:false,comments:[],author:'我'};if(await save(commit,'posts',[post,...posts.value],'帖子已加入账号的社区体验，还没有公开到网络')){composing.value=false;title.value='';text.value='';snapshotId.value=''}}
function attach(){const s=snapshots.value.find(x=>String(x.id)===snapshotId.value);if(s){title.value=s.title;text.value=s.signal||s.coreReport?.inner||''}}
async function like(post){await save(commit,'posts',posts.value.map(p=>p.id===post.id?{...p,liked:!p.liked}:p),post.liked?'已收回喜欢':'这束微光，已收到你的喜欢')}
async function addComment(post){const value=comment.value[post.id]?.trim();if(!value)return notify('先写一句温柔的回应');if(await save(commit,'posts',posts.value.map(p=>p.id===post.id?{...p,comments:[...p.comments,{id:Date.now(),text:value,date:today(),author:'我'}]}:p),'回应已留在当前账号中'))comment.value[post.id]=''}
async function share(post){try{if(navigator.share){await navigator.share({title:post.title,text:post.text});return}await navigator.clipboard.writeText([post.title,post.text].join(String.fromCharCode(10)));notify('帖子文字已复制，可以自行分享')}catch(e){if(e.name!=='AbortError')notify('浏览器未允许分享，请手动复制文字')}}
async function remove(){if(await save(commit,'posts',posts.value.filter(p=>p.id!==confirmDelete.value),'帖子已从当前账号删除'))confirmDelete.value=null}
onMounted(refresh)
</script>
<template>
<div class="journey">
 <p class="j-notice"><span class="j-dot"></span>账号的社区体验 · 帖子、喜欢和评论只保存在当前账号，不会公开，也没有真实的其他用户。</p>
 <section class="j-panel community-header"><div><h2>让愿意分享的梦，有人轻轻接住</h2><p>尊重彼此的感受，不作解梦、诊断或吉凶判断。</p></div><button class="j-primary" @click="composing=!composing">{{composing?'收起编辑':'分享一束微光'}}</button></section>
 <section v-if="composing" class="j-panel"><h3>由你决定，分享多少</h3><label>从梦库带入（可选）<select v-model="snapshotId" @change="attach"><option value="">不关联快照</option><option v-for="s in snapshots" :key="s.id" :value="String(s.id)">{{s.title}}</option></select></label><div class="j-grid j-section-gap"><label>标题<input v-model="title" maxlength="60" placeholder="昨夜的一点微光"></label><div class="j-help">分享前请移除不愿公开的个人资料。当前只做本机预览。</div></div><label class="j-section-gap">片段<textarea v-model="text" rows="4" maxlength="2000" placeholder="留一段自己愿意分享的梦…"></textarea></label><button class="j-primary j-section-gap" @click="publish">加入账号的社区体验</button></section>
 <section class="community-topics j-section-gap"><h3>沿着一种感受，遇见梦的片段</h3><div class="j-tabs" role="group" aria-label="浏览梦境话题"><button v-for="t in topics" :key="t" :aria-pressed="topic===t" :class="{'j-selected':topic===t}" @click="topic=t">{{t}}</button></div><small>下方为虚构示例片段，供浏览和体验，不代表真实用户分享。</small></section>
 <div v-if="visibleExamples.length" class="community-examples"><article v-for="p in visibleExamples" :key="p.id" class="j-panel example-card"><img :src="p.image" alt="示例梦境氛围画面" loading="lazy"><div class="example-copy"><div class="j-row"><span class="j-tag">虚构示例</span><small>{{p.feeling}}</small></div><h3>{{p.title}}</h3><p>{{p.text}}</p><p class="example-question">{{p.question}}</p><div class="j-row"><button class="j-small-action" :aria-pressed="exampleLikes.includes(p.id)" :class="{'j-selected':exampleLikes.includes(p.id)}" @click="toggleExample(p)">{{exampleLikes.includes(p.id)?'已收到这束微光':'轻轻接住'}}</button><button class="j-small-action" @click="beginFromExample(p)">写下我的回响</button></div></div></article></div>
 <section v-if="topic==='全部'||topic==='我的分享'" class="j-section-gap"><h3>我留下的微光</h3><small>只有你能看到这里的分享与回应。</small></section>
 <div class="community-feed j-section-gap"><article v-for="p in visiblePosts" :key="p.id" class="j-panel"><div class="j-between"><span class="j-tag">我的分享 · 当前账号</span><small>{{p.date}}</small></div><h2 class="j-section-gap">{{p.title}}</h2><img v-if="p.image" :src="p.image" alt="帖子附带的梦境画面" class="j-art"><p class="j-prose">{{p.text}}</p><div class="j-row"><button :aria-pressed="p.liked" :class="{'j-selected':p.liked}" @click="like(p)"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 20 4 12C-2 5 7 0 12 7c5-7 14-2 8 5Z"/></svg>{{p.liked?1:0}}</button><button @click="expanded=expanded===p.id?null:p.id">回应 {{p.comments.length}}</button><button @click="share(p)">分享文字</button><button @click="router.push({path:'/dream/studio',query:{}})">制作海报</button><button class="j-small-action" @click="confirmDelete=p.id">删除</button></div><div v-if="expanded===p.id" class="j-section-gap"><p v-for="c in p.comments" :key="c.id" class="community-comment"><small>{{c.author}} · {{c.date}}</small><br>{{c.text}}</p><label>留一句回应<input v-model="comment[p.id]" maxlength="300" placeholder="只交流感受，不给梦下结论" @keyup.enter="addComment(p)"></label><button class="j-small-action j-section-gap" @click="addComment(p)">留下回应</button></div></article></div>
 <div v-if="!posts.length && (topic==='全部'||topic==='我的分享')" class="j-empty j-section-gap"><img src="/dream-rooms/garden.png" alt="安静的梦境花园"><h3>你的分享区，还在等第一束微光</h3><p>你可以先在自己的账号中体验分享，也可以把梦留在自己的梦库。</p><button @click="composing=true">写一段愿意分享的梦</button></div>
 <Teleport to="body"><div v-if="confirmDelete" class="journey j-modal-mask" @click.self="confirmDelete=null" @keydown.esc="confirmDelete=null"><section class="j-modal" role="alertdialog" aria-modal="true" aria-label="确认移除帖子"><h2>要移除这束分享吗？</h2><p>会删除这条本机帖子及其回应，梦库里的原快照仍然保留。</p><div class="j-row"><button autofocus @click="confirmDelete=null">保留</button><button @click="remove">确认移除</button></div></section></div></Teleport><div v-if="toast" class="j-toast" role="status">{{toast}}</div>
</div>
</template>
<style scoped>.community-header{display:flex;justify-content:space-between;align-items:center;gap:22px}.community-feed{max-width:920px;display:grid;gap:22px}.community-feed>.j-panel{margin:0}.community-comment{padding:12px 15px;border-radius:12px;background:#f5f1f9;white-space:pre-wrap;overflow-wrap:anywhere}.community-feed .j-art{max-height:400px;object-fit:contain;background:#f2eef6}@media(max-width:600px){.community-header{align-items:flex-start;flex-direction:column}}</style>

<style scoped>
.community-examples{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;margin-top:22px}.community-examples .example-card{margin:0;padding:0;overflow:hidden}.example-card>img{width:100%;height:180px;display:block;object-fit:cover}.example-copy{padding:24px}.example-copy h3{margin:16px 0 10px}.example-copy>p{font-size:14px;line-height:1.9}.example-question{padding-top:14px;border-top:1px solid var(--j-line);color:var(--j-muted)}.community-topics .j-tabs{margin-bottom:8px}@media(max-width:760px){.community-examples{grid-template-columns:1fr}.example-copy{padding:20px}.example-card>img{height:160px}}
</style>
