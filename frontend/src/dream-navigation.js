const icon = {
  moon: 'M20 13A8 8 0 1 1 11 4a6 6 0 0 0 9 9Z',
  pen: 'm4 16 12-12 4 4L8 20H4Z M13 7l4 4',
  bottle: 'M9 3h6v5l4 5v7H5v-7l4-5Z M9 6h6 M8 14h8',
  book: 'M4 4h7l1 2 1-2h7v15h-7l-1 1-1-1H4Z M12 6v14',
  art: 'M4 4h16v16H4Z m0 12 5-5 4 4 3-3 4 4 M15 8h.01',
  people: 'M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 21v-2a7 7 0 0 1 14 0v2 M17 5a4 4 0 0 1 0 8 M19 16a5 5 0 0 1 3 5',
  calendar: 'M4 5h16v15H4Z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2',
  path: 'M6 4v16 M6 5h12v5H6 M6 15h12v5H6',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l4 2',
  planet: 'M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M3 16c-4-2 11-13 18-9 3 3-10 12-18 9',
  cloud: 'M6 18a5 5 0 0 1-1-10 7 7 0 0 1 13-1 5.5 5.5 0 0 1 0 11Z',
  heart: 'M12 20 4 12C-2 5 7 0 12 7c5-7 14-2 8 5Z',
  wave: 'M3 9c3-6 6 6 9 0s6 6 9 0 M3 15c3-6 6 6 9 0s6 6 9 0',
  seed: 'M12 21V11 M12 14C3 14 3 6 3 6s9 0 9 8 M12 11c0-8 9-8 9-8s0 8-9 8',
  pair: 'M3 5h7v14H3Z M14 5h7v14h-7Z M10 12h4'
}
const entry = (label, path, intro, glyph, surface) => ({ label, path, intro, icon: icon[glyph], surface })
export const dreamNavigation = [
  { label: '梦境空间', items: [
    entry('梦境总览', '/dream', '昼夜信号在此相遇，看看白天的分身，和夜里的意识如何相互回响。', 'moon'),
    entry('✦ 记梦', '/capture', '趁意识还未消散，捕捉昨夜的碎片。', 'pen'),
    entry('梦库', '/dream/library', '把旧日梦境一一珍藏，让每一束微光都有归处。', 'book', 'library'),
    entry('漂流瓶', '/dreams', '把心事交给星海，让温柔在此靠岸。', 'bottle', 'bottle'),
  ] },
  { label: '梦境创作', items: [
    entry('梦境创作社区', '/dream/studio', '创作梦境画面、故事与海报，留下愿意分享的片段。', 'art', 'studio'),
    {
      label: '梦境内核测试',
      path: '/dream/forgotten',
      intro: '潜入你的潜意识，找到专属于你的梦境内核。',
      view: 'capture',
      icon: 'M4 4h16v16H4Z M8 9h8 M8 14h5'
    },
  ] },
  { label: '夜的陪伴', items: [
    entry('睡眠日记', '/dream/sleep-diary', '不为夜晚打分，只轻轻留下身体真实的感受。', 'calendar', 'sleep'),
    entry('睡眠改善计划', '/dream/sleep-plan', '从一个小习惯开始，慢慢找到适合自己的节律。', 'path', 'sleep'),
    entry('睡前流程', '/dream/wind-down', '把睡前的时间留给自己，一步一步安静下来。', 'clock', 'sleep'),
    entry('星夜叙语', '/dream/night-talk', '听一段故事，或留下一句心事，让夜晚多一点陪伴。', 'book', 'companion'),
  ] },
]
