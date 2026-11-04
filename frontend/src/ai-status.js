/**
 * AI 服务连接状态。所有需要云端能力的入口都先问它一句：
 * 没有配置就直接把用户带到「AI 服务设置」，而不是各页面各写一套提示。
 */
const CACHE_MS = 30000
const PROMPT_KEY = 'mengsu-ai-setup-prompted'
export const SETUP_PATH = '/settings/ai'

let cached = null
let cachedAt = 0
let inflight = null

export function invalidateAiStatus() {
  cached = null
  cachedAt = 0
}

export async function aiStatus(force = false) {
  if (!force && cached && Date.now() - cachedAt < CACHE_MS) return cached
  if (inflight) return inflight
  inflight = (async () => {
    let next = { configured: true, source: 'unknown' }
    try {
      const response = await fetch('/api/ai-settings', { cache: 'no-store', signal: AbortSignal.timeout(6000) })
      if (response.ok) {
        const data = await response.json()
        next = { configured: Boolean(data.configured), source: data.source || (data.configured ? 'server' : 'none') }
      }
    } catch {
      // 服务暂时没响应时不能拦住浏览，交给页面自己的报错
    }
    cached = next
    cachedAt = Date.now()
    return next
  })()
  try {
    return await inflight
  } finally {
    inflight = null
  }
}

/** 后端说"尚未连接 / 请打开 AI 服务设置"，就是要补配置，而不是内容出错。 */
export function needsSetup(message) {
  return /尚未连接|AI\s*服务设置/.test(String(message || ''))
}

export function setupPrompted() {
  try {
    return sessionStorage.getItem(PROMPT_KEY) === '1'
  } catch {
    return false
  }
}

export function markSetupPrompted() {
  try {
    sessionStorage.setItem(PROMPT_KEY, '1')
  } catch {}
}

export function clearSetupPrompted() {
  try {
    sessionStorage.removeItem(PROMPT_KEY)
  } catch {}
}

/** 跳到设置页，并记住来处，配置完可以一键回到刚才的页面。 */
export async function openAiSetup(from) {
  markSetupPrompted()
  invalidateAiStatus()
  const { router } = await import('./router')
  const origin = from || router.currentRoute.value?.fullPath || ''
  const query = origin && !String(origin).startsWith(SETUP_PATH) ? { from: origin } : {}
  if (router.currentRoute.value?.path === SETUP_PATH) return
  await router.push({ path: SETUP_PATH, query })
}

/**
 * 路由守卫用：进入主应用时若还没连接 AI，直接把用户带到设置页。
 * 每个会话只拦一次，避免用户想先浏览时被反复弹回来。
 */
export async function redirectToSetupIfNeeded(to) {
  if (!to.meta?.healthPage || to.path === SETUP_PATH || (to.path === '/dream/tree-hole' || to.path === '/dream/night-talk')) return true
  if (setupPrompted()) return true
  const status = await aiStatus()
  if (status.configured) return true
  markSetupPrompted()
  return { path: SETUP_PATH, query: { from: to.fullPath } }
}
