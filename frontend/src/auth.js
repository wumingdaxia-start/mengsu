// All spaces use the safety server's HttpOnly cookie. Storage is a UI cache only.
export const SAFETY_API_BASE = `${location.protocol}//${location.hostname}:3001`
const AUTH_KEY = 'mengsu-auth'
const CHANGE_KEY = 'mengsu-auth-change'
let revision = 0
let refreshing = null
export function isLoggedIn() {
  try { return Boolean(JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null')?.id) }
  catch { return false }
}
export function requireLogin() {
  if (isLoggedIn()) return true
  window.alert('请先登录账号后再保存。你当前填写的内容会保留在页面中。')
  return false
}

export async function safetyRequest(path, options = {}) {
  let response
  try {
    response = await fetch(`${SAFETY_API_BASE}${path}`, { ...options, credentials: 'include', cache: 'no-store', signal: options.signal || AbortSignal.timeout(8000) })
  } catch { throw new Error('账号服务暂时无法连接，请确认安全服务已启动后重试') }
  let data = {}
  try { data = await response.json() } catch {}
  if (!response.ok) {
    const error = new Error(data.message || '账号服务暂时不可用，请稍后重试')
    error.status = response.status
    throw error
  }
  return data
}

export async function signIn(account, password, remember = true) {
  const version = ++revision
  refreshing = null
  await safetyRequest('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ account, password, remember, mode: 'user' }) })
  const { user = {} } = await safetyRequest('/api/me')
  if (version === revision) updateUser(user, remember, true)
  return user
}

export async function signOut() {
  ++revision
  refreshing = null
  await safetyRequest('/api/logout', { method: 'POST' })
  updateUser(null, false, true)
}

function updateUser(user, remember, broadcast = false) {
  const previous = sessionStorage.getItem(AUTH_KEY)
  if (user?.id && user.account) {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify({ id: user.id, account: user.account, email: user.account, name: user.name || '', remembered: remember }))
  } else sessionStorage.removeItem(AUTH_KEY)
  if (previous !== sessionStorage.getItem(AUTH_KEY)) window.dispatchEvent(new Event('mengsu:auth-change'))
  if (broadcast) localStorage.setItem(CHANGE_KEY, `${Date.now()}:${Math.random()}`)
}

export async function refreshSession() {
  if (refreshing) return refreshing
  const version = revision
  const request = (async () => {
    try {
      const { user } = await safetyRequest('/api/me')
      if (version === revision) updateUser(user, true)
      return user || null
    } catch {
      if (version === revision) updateUser(null)
      return null
    }
  })()
  refreshing = request
  try { return await request } finally { if (refreshing === request) refreshing = null }
}

export function startAuthSync() {
  const refresh = () => { void refreshSession() }
  const visible = () => { if (document.visibilityState === 'visible') refresh() }
  const storage = event => { if (event.key === CHANGE_KEY) refresh() }
  window.addEventListener('focus', refresh)
  window.addEventListener('storage', storage)
  document.addEventListener('visibilitychange', visible)
  const timer = window.setInterval(visible, 15000)
  return () => {
    clearInterval(timer)
    window.removeEventListener('focus', refresh)
    window.removeEventListener('storage', storage)
    document.removeEventListener('visibilitychange', visible)
  }
}
