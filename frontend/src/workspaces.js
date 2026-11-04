import { dreamNavigation } from './dream-navigation'
// The animated entrance selects a workspace; authentication never changes it.
export const WORKSPACES = {
  safety: { name: '安康', subtitle: '花屿 · 健康安全管理', home: '/safety', scene: 0, greeting: '健康生活从今天开始吧！' },
  dream: { name: '花屿星', subtitle: '鱼庭 · 梦境与记忆', home: '/dream', scene: 1, greeting: '把醒来时的梦，轻轻留下。' },
  psychology: { name: '心灵', subtitle: '星栈 · 留意内心的声音', home: '/psychology', scene: 2, greeting: '此刻的感受，都值得被听见。' }
}

export const ENTRY_PATHS = Object.values(WORKSPACES).map(space => space.home)
export const LOGIN_DESTINATIONS = [...ENTRY_PATHS, '/home', '/profile', '/activity', '/nutrition', '/sleep', '/vision', '/challenges', '/smart-consult', '/mood', '/health-analysis', '/capture', '/dreams', '/ask', '/dream/cues', '/psychology/analysis', '/psychology/journal', '/psychology/breathe', '/psychology/history', '/psychology/personality', '/psychology/tarot', '/psychology/views-test', '/psychology/space']

export function loginDestination(next) {
  return typeof next === 'string' && [...LOGIN_DESTINATIONS, ...dreamNavigation.flatMap(group => group.items.map(item => item.path))].includes(next) ? next : '/safety'
}

export function entryDestination(path, loggedIn) {
  if (!ENTRY_PATHS.includes(path)) return null
  return loggedIn ? path : { path: '/login', query: { next: path } }
}

