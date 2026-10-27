// UI session gate. Server-side authentication is still required for production.
export function isLoggedIn() {
  try { return Boolean(JSON.parse(sessionStorage.getItem('mengsu-auth') || 'null')?.email) }
  catch { return false }
}
export function requireLogin() {
  if (isLoggedIn()) return true
  window.alert('请先登录账号后再保存。你当前填写的内容会保留在页面中。')
  return false
}
