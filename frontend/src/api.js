const jsonHeaders = { 'Content-Type': 'application/json' }
const REQUEST_TIMEOUT_MS = 8000

async function call(path, options = {}) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  let response
  try {
    response = await fetch(path, { ...options, signal: options.signal || controller.signal })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('本地服务暂时没有响应，请稍后刷新页面')
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`${response.status} ${text.slice(0, 200)}`)
  }
  return response.json()
}

function post(path, payload) {
  return call(path, { method: 'POST', headers: jsonHeaders, body: JSON.stringify(payload) })
}

function query(params) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.append(key, value)
  })
  const text = search.toString()
  return text ? `?${text}` : ''
}

export const api = {
  health: () => call('/api/health'),
  companion: () => call('/api/companion/now'),
  home: () => call('/api/home'),

  send: (text) => post('/api/input', { text }),
  day: (day) => call(`/api/day/${day}`),
  pending: () => call('/api/pending'),
  timeline: (start, end) => call(`/api/timeline${query({ start, end })}`),

  fragments: (params = {}) => call(`/api/fragments${query(params)}`),
  createFragment: (payload) => post('/api/fragments', payload),
  deleteFragment: (id) => call(`/api/fragments/${id}`, { method: 'DELETE' }),
  uploadPhoto: (file) => {
    const form = new FormData()
    form.append('file', file)
    return call('/api/fragments/photo', { method: 'POST', body: form })
  },

  cue: (items) => post('/api/cue', { items }),
  cuePlayed: (session_id) => post('/api/cue/played', { session_id }),
  cueReview: (payload) => post('/api/cue/review', payload),
  cueAudio: (session_id) => post(`/api/cue/${session_id}/audio`, {}),

  stats: () => call('/api/dreams/stats'),
  searchDreams: (query) => call(`/api/dreams/search${query}`),
  insight: (start, end) => call(`/api/dreams/insight${query({ start, end })}`),
  dna: () => call('/api/dreams/dna'),
  network: () => call('/api/dreams/network'),
  dreamMap: () => call('/api/dreams/map'),
  models: () => call('/api/models'),
  palette: () => call('/api/dreams/palette'),
  dayTitle: (day) => call(`/api/dreams/day-title${query({ day })}`),
  ask: (question) => post('/api/dreams/ask', { question }),
  exportDreams: (start, end) => post('/api/dreams/export', { start, end }),
  narrative: (start, end) => post('/api/narrative', { start, end }),

  memoryTools: () => call('/api/memory/tools'),
  memoryRecall: (query, max_results = 5) => post('/api/memory/recall', { query, max_results })
}

export function today() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

export function daysAgo(count) {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset - count * 86400000).toISOString().slice(0, 10)
}

export function shortDay(value) {
  return (value || '').slice(5).replace('-', '/')
}
