// The animated entrance selects a workspace; authentication never changes it.
export const WORKSPACES = {
  safety: { name: '安康守护', subtitle: '花屿 · 健康安全管理', home: '/safety', scene: 0, greeting: '健康生活从今天开始吧！' },
  dream: { name: '梦溯', subtitle: '鱼庭 · 梦境与记忆', home: '/dream', scene: 1, greeting: '把醒来时的梦，轻轻留下。' },
  psychology: { name: '心理空间', subtitle: '星栈 · 留意内心的声音', home: '/psychology', scene: 2, greeting: '此刻的感受，都值得被听见。' }
}

export const ENTRY_PATHS = Object.values(WORKSPACES).map(space => space.home)
export const LOGIN_DESTINATIONS = [...ENTRY_PATHS, '/home', '/profile', '/activity', '/nutrition', '/sleep', '/vision', '/challenges', '/smart-consult', '/mood', '/health-analysis', '/capture', '/dreams', '/ask', '/dream/cues', '/psychology/journal', '/psychology/breathe', '/psychology/history']

export function loginDestination(next) {
  return typeof next === 'string' && LOGIN_DESTINATIONS.includes(next) ? next : '/safety'
}

export function entryDestination(path, loggedIn) {
  if (!ENTRY_PATHS.includes(path)) return null
  return loggedIn ? path : { path: '/login', query: { next: path } }
}
