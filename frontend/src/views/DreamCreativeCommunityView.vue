<script setup>
import { computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import DreamStudioView from "./DreamStudioView.vue"
import DreamRecordNotebook from "./DreamRecordNotebook.vue"
import DreamCommunityView from "./DreamCommunityView.vue"
const route=useRoute(),router=useRouter()
const section=computed(()=>["community","studio"].includes(route.query.section)?route.query.section:"record")
function select(value){router.replace({path:"/dream/studio",query:{...route.query,section:value}})}
</script>
<template>
 <div class="creative-community">
  <div role="group" class="creative-sections" aria-label="梦境创作社区功能">
   <button :aria-pressed="section==='record'" @click="select('record')">记录梦境<span>说梦 · 标签 · 梦境报告</span></button>
   <button :aria-pressed="section==='studio'" @click="select('studio')">创作工坊<span>绘图 · 故事 · 海报</span></button>
   <button :aria-pressed="section==='community'" @click="select('community')">社区分享<span>浏览片段 · 留下回响</span></button>
  </div>
  <DreamRecordNotebook v-if="section==='record'" />
  <div v-show="section==='studio'"><DreamStudioView /></div>

  <div v-show="section==='community'"><DreamCommunityView /></div>
 </div>
</template>
<style scoped>
.creative-community{width:100%;max-width:none;margin:0;box-sizing:border-box}.creative-sections{box-sizing:border-box;width:100%}
.creative-sections{display:flex;gap:12px;margin-bottom:24px;padding:6px;border:1px solid #e8e0ee;border-radius:20px;background:#faf7fc}.creative-sections button{flex:1;padding:14px 18px;border:1px solid transparent;border-radius:15px;background:transparent;color:#796b84;font:18px/1.5 SimSun,serif;cursor:pointer}.creative-sections button[aria-pressed="true"]{background:#ece4f3;border-color:#dacee6;color:#5f4c73}.creative-sections span{display:block;margin-top:4px;font:13px/1.7 "Microsoft YaHei",sans-serif;color:#83768c}.creative-sections button:focus-visible{outline:2px solid #9478ad;outline-offset:3px}@media(max-width:600px){.creative-sections{gap:4px}.creative-sections button{padding:12px 5px;font-size:16px}.creative-sections span{font-size:11px}}
</style>
