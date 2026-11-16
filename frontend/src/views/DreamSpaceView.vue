<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { refreshSession } from '../auth'
import { dreamReady, dreamError, readDream, retryDreamAccount } from '../dream-account'
import { useDreamJourney } from '../composables/useDreamJourney'
const router=useRouter(),{snapshots,materials,journals}=useDreamJourney()
const user=ref(null)
function syncUser(){try{user.value=JSON.parse(sessionStorage.getItem('mengsu-auth')||'null')}catch{user.value=null}}
const loggedIn=computed(()=>!!user.value?.id)
const stories=computed(()=>{const list=readDream('notes',{}).storyFavorites;return Array.isArray(list)?list:[]})
const stats=computed(()=>[
 {label:'梦境记录',value:snapshots.value.length,unit:'条',path:'/dream/library'},
 {label:'创作素材',value:materials.value.length,unit:'份',path:'/dream/studio?section=studio'},
 {label:'睡眠日记',value:journals.value.length,unit:'晚',path:'/dream/sleep-diary'},
 {label:'故事收藏',value:stories.value.length,unit:'篇',path:'/dream/night-talk?section=favorites'}
])
function login(){router.push({path:'/login',query:{next:'/dream/space'}})}
syncUser()
onMounted(()=>{window.addEventListener('mengsu:auth-change',syncUser);void refreshSession().then(syncUser)})
onBeforeUnmount(()=>window.removeEventListener('mengsu:auth-change',syncUser))
</script>
<template>
 <div class="journey dream-space">
  <section class="j-panel space-account">
   <div class="space-account-heading"><div class="space-identity"><div><small>鱼庭 / 我的账号</small><h2>{{loggedIn?(user.name||'我的账号'):'欢迎来到你的梦境空间'}}</h2></div></div><span class="space-status">{{loggedIn?'已登录':'游客模式'}}</span></div>
   <p v-if="!loggedIn" class="space-note">登录后，在这里查看属于你的梦境、睡眠日记和故事收藏。</p>
   <p v-if="loggedIn&&dreamError" class="space-error" role="alert">记录暂时未能载入。<button @click="retryDreamAccount">重新载入</button></p>
   <div class="space-statistics"><button v-for="item in stats" :key="item.label" @click="router.push(item.path)"><span>{{item.label}}</span><strong>{{loggedIn&&!dreamReady?'—':loggedIn?item.value:0}}<small>{{item.unit}}</small></strong></button></div>
   <div class="space-shortcuts"><button @click="router.push('/dream/studio?section=record')">记录梦境 →</button><button @click="router.push('/dream/library')">查看我的梦库 →</button><button @click="router.push('/dream/forgotten')">梦境内核测试 →</button></div>
   <button v-if="!loggedIn" class="j-primary space-login" @click="login">登录 / 注册</button>
  </section>
 </div>
</template>
<style scoped>
.dream-space{max-width:1080px;margin:auto;color:#665970}.dream-space>.j-panel{padding:28px;border:1px solid #e6dfed;border-radius:20px;background:#fffdfde8;box-shadow:none}.dream-space h2{margin:0;font:500 23px/1.5 var(--display,serif)}.space-account-heading,.space-section-heading{display:flex;justify-content:space-between;gap:20px;align-items:center}.space-identity{display:flex;align-items:center;gap:16px;min-width:0}.space-identity>div{min-width:0}.space-identity h2{overflow-wrap:anywhere}.space-identity small{font-size:12px;color:#9989a5}.space-avatar{display:grid;place-items:center;flex-shrink:0;width:58px;height:58px;border-radius:18px;background:#eee7f4;color:#9477a7;font:26px var(--display,serif)}.space-status{font-size:12px;white-space:nowrap;color:#927c9e}.space-statistics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;padding:24px 0;margin:24px 0 18px;border-block:1px solid #ece6f0}.space-statistics button{text-align:left;background:none;border:0;padding:0;border-radius:0}.space-statistics span{display:block;color:#97899f;font-size:13px}.space-statistics strong{display:block;margin-top:10px;font:500 29px/1.4 var(--display,serif);color:#766182}.space-statistics small{font:12px var(--ui,sans-serif);margin-left:7px}.space-shortcuts{display:flex;gap:20px;flex-wrap:wrap}.space-shortcuts button{padding:4px 0;background:none;border:0;font-size:14px;color:#8e73a1}.space-note,.space-empty p{font-size:14px;line-height:1.8;color:#9989a5}.space-login{margin-top:18px}.space-section-heading small{font-size:12px;color:#a18eac}.space-record{display:flex;align-items:center;gap:18px;width:100%;padding:18px 0;border:0;border-top:1px solid #eee7f1;border-radius:0;background:none;text-align:left}.space-record:first-of-type{margin-top:20px}.space-record>span:first-child{flex:1;min-width:0}.space-record small{display:block;color:#9e8ca8;font-size:12px}.space-record strong{display:block;font-size:15px;font-weight:500;margin-top:6px;overflow-wrap:anywhere}.space-record time{font-size:12px;white-space:nowrap;color:#a294a9}.space-setting-list{margin-top:20px}.space-setting-list>button{width:100%;display:flex;align-items:center;justify-content:space-between;text-align:left;gap:18px;padding:18px 0;border:0;border-top:1px solid #eee7f1;border-radius:0;background:none}.space-setting-list strong{display:block;font-size:15px;font-weight:500}.space-setting-list small{display:block;margin-top:6px;font-size:13px;color:#a08eac;line-height:1.7}.space-setting-list b{font-weight:400;font-size:20px}.space-setting-list button:disabled{opacity:.5;cursor:default}.space-settings-footer{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-top:18px;border-top:1px solid #eee7f1;padding-top:18px}.space-settings-footer p{font-size:12px;color:#a08eac;margin:0}.space-settings-footer button{color:#a1748b;background:#fff9fc;border-color:#eadce5}.dream-space button:focus-visible{outline:2px solid #a78aba;outline-offset:4px}.space-error{font-size:14px;color:#a46278}@media(max-width:600px){.dream-space>.j-panel{padding:20px 16px}.space-statistics{grid-template-columns:1fr 1fr;gap:22px}.space-account-heading{align-items:flex-start;gap:10px}.space-identity{gap:12px}.space-avatar{width:46px;height:46px;border-radius:14px}.dream-space h2{font-size:21px}.space-shortcuts{gap:12px}.space-record{gap:10px}.space-record time{font-size:11px}.space-setting-list small{font-size:12px}}
</style>
