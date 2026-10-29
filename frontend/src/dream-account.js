import { ref } from 'vue'
import { safetyRequest } from './auth'

export const dreamOwner = ref('')
export const dreamReady = ref(false)
export const dreamError = ref('')
export const dreamValues = ref({})
let versions = {}, epoch = 0, pending = null, writes = Promise.resolve()
const clone = value => JSON.parse(JSON.stringify(value))
function account() {
  try { return String(JSON.parse(sessionStorage.getItem('mengsu-auth') || 'null')?.id || '') } catch { return '' }
}
export function readDream(key, fallback) { return clone(dreamValues.value[key] ?? fallback) }
export function syncDreamAccount() {
  const owner = account()
  if (owner === dreamOwner.value && (dreamReady.value || pending)) return pending || Promise.resolve()
  const ticket = ++epoch
  dreamOwner.value = owner
  dreamValues.value = {}; versions = {}; dreamError.value = ''; dreamReady.value = !owner
  pending = null
  if (!owner) return Promise.resolve()
  const request = safetyRequest('/api/dream-data', { headers: { 'X-Health-User': owner } }).then(result => {
    if (ticket !== epoch || account() !== owner) return
    dreamValues.value = result.values; versions = result.revisions; dreamReady.value = true
  }).catch(error => { if (ticket === epoch) dreamError.value = error.message }).finally(() => { if (pending === request) pending = null })
  pending = request
  return request
}
export function retryDreamAccount() { dreamReady.value = false; return syncDreamAccount() }
export function writeDream(key, value) {
  const owner = account(), ticket = epoch, payload = clone(value)
  const operation = writes.catch(() => {}).then(async () => {
    if (!owner || owner !== dreamOwner.value || ticket !== epoch || !dreamReady.value) throw new Error('请先登录并等待账号记录加载完成')
    const result = await safetyRequest('/api/dream-data', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Health-User': owner }, body: JSON.stringify({ key, value: payload, revision: versions[key] || 0 }) })
    if (ticket !== epoch || account() !== owner) throw new Error('账号已切换，本次显示已取消')
    versions[key] = result.revision
    dreamValues.value = { ...dreamValues.value, [key]: result.value }
    return result.value
  })
  writes = operation
  return operation
}
window.addEventListener('mengsu:auth-change', () => { void syncDreamAccount() })
void syncDreamAccount()

// Old browser records had no owner. Only an explicit, confirmed import may claim them.
const legacyKeys={snapshots:'mengsu-signal-snapshots',journals:'mengsu-journey-journals',plan:'mengsu-journey-plan',rituals:'mengsu-journey-rituals',holes:'mengsu-journey-holes',posts:'mengsu-journey-posts',creations:'mengsu-journey-creations',seeds:'mengsu-signal-seeds',receipts:'mengsu-signal-receipts',notes:'mengsu-signal-notes',prefs:'mengsu-signal-prefs',clusters:'mengsu-signal-clusters',conversations:'mengsu-signal-conversations',drift:'mengsu-drift-v1'}
function legacyRecords(){
  const records={}
  for(const [key,storageKey] of Object.entries(legacyKeys)){
    try{const value=JSON.parse(localStorage.getItem(storageKey)||'null');if(value&&typeof value==='object'&&Object.keys(value).length)records[key]=value}catch{}
  }
  return records
}
export function hasLegacyDreamRecords(){return Object.keys(legacyRecords()).length>0}
export async function importLegacyDreamRecords(){
  if(!dreamOwner.value)throw new Error('请先登录')
  const owner=dreamOwner.value
  for(const [key,value] of Object.entries(legacyRecords())){
    if(owner!==dreamOwner.value)throw new Error('账号已切换，导入已停止')
    const current=dreamValues.value[key]
    let merged=value
    if(Array.isArray(value)&&Array.isArray(current)){
      const ids=new Set(current.map(x=>String(x?.id??JSON.stringify(x))))
      merged=[...current,...value.filter(x=>!ids.has(String(x?.id??JSON.stringify(x))))]
    }else if(current){merged={...value,...current}}
    await writeDream(key,merged)
  }
}
