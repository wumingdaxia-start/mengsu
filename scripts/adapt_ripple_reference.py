"""Localize the user-selected reference demo, preserving its artwork and credit.

Source: https://pastel-lab.pages.dev/flower-water-ripples/
The upstream HTML snapshot is kept in qa/reference for reproducible adaptation.
"""
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
target = ROOT / 'frontend/public/entry-ripples'
(target / 'assets').mkdir(parents=True, exist_ok=True)
source = (ROOT / 'qa/reference/flower-water-ripples.html').read_text(encoding='utf-8')
source = source.replace('<html lang="ja">', '<html lang="zh-CN">')
source = source.replace('width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no', 'width=device-width, initial-scale=1.0')
source = re.sub(r'<link[^>]+(?:fonts.googleapis.com|fonts.gstatic.com)[^>]*>\s*', '', source)
source = source.replace('<style>', '<link rel="stylesheet" href="assets/fonts.css">\n<style>', 1)
source = source.replace('<div id="stage">', '<div id="stage" tabindex="0" role="application" aria-label="互动水面，移动鼠标或拖动手指产生涟漪，空格键轻触水面">')
source = source.replace('title="settings"', 'title="settings" aria-label="效果设置" aria-controls="panel" aria-expanded="true"')
source = source.replace('title="reset"', 'title="reset" aria-label="重置水面"')
source = source.replace('title="save image"', 'title="save image" aria-label="保存画面"')
for label, element in [('sparkle', 'rSparkle'), ('ripple', 'rRipple'), ('petals', 'rPetals'), ('light', 'rLight')]:
    source = source.replace(f'<label>{label}</label>', f'<label for="{element}">{label}</label>')
source = source.replace('id="cursor" viewBox', 'id="cursor" aria-hidden="true" viewBox')
source = source.replace('<body>', '''<body>
<button id="motionToggle" class="integration-control" aria-label="暂停动态效果" aria-pressed="false" title="暂停动态效果"><span class="material-symbols-rounded" aria-hidden="true">pause</span></button>
<a id="mengsuEnter" class="integration-control" href="/home" target="_top">进入花屿星 <span aria-hidden="true">↗</span></a>
<p id="renderStatus" role="status" aria-live="polite"></p>''')
source = source.replace('</style>', '''
  /* Local integration: retain the original composition and author attribution. */
  #stage { background: url('assets/water.jpg') center / cover no-repeat; }
  :is(a,button,input,#stage):focus-visible { outline:2px solid #69899f; outline-offset:4px; }
  .integration-control { position:fixed; z-index:20; min-height:38px; color:#54718c; background:rgba(250,253,255,.55); border:1px solid rgba(255,255,255,.75); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); box-shadow:0 4px 14px #7896af19; cursor:pointer; text-shadow:0 1px 0 #fff; text-decoration:none; }
  #motionToggle { top:max(20px,env(safe-area-inset-top)); left:20px; width:38px; border-radius:50%; display:grid; place-items:center; }
  #motionToggle span { font-size:18px; }
  #motionToggle:disabled { opacity:.55; cursor:default; }
  #mengsuEnter { top:max(20px,env(safe-area-inset-top)); right:20px; display:flex; align-items:center; gap:12px; padding:0 14px; border-radius:20px; font-size:11px; }
  #renderStatus { position:fixed; left:50%; bottom:100px; transform:translateX(-50%); max-width:85vw; text-align:center; color:#49647a; font-size:12px; z-index:20; }
  #stage:focus-visible { outline-offset:-6px; }
  #cursor { left:0; top:0; }
  .is-paused #hint { animation-play-state:paused; }
  @media(max-width:720px){ #motionToggle { top:max(14px,env(safe-area-inset-top)); left:12px; } #mengsuEnter { top:auto; bottom:max(18px,env(safe-area-inset-bottom)); left:50%; right:auto; transform:translateX(-50%); min-height:44px; padding:0 20px; } #renderStatus { bottom:84px; } }
  @media(prefers-reduced-motion:reduce){ *,*::before,*::after { animation:none!important; transition:none!important; } #stage { cursor:auto; } #cursor { display:none; } }
</style>''', 1)
source = source.replace("const DPR  = Math.min(window.devicePixelRatio || 1, 2);", '''const DPR = Math.min(window.devicePixelRatio || 1, 2);
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = motionQuery.matches, paused = reduced, stopped = false, frameId = 0, ready = false, elapsed = 0;
const motionToggle = document.getElementById('motionToggle');
const renderStatus = document.getElementById('renderStatus');
function updateMotionButton() {
  document.documentElement.classList.toggle('is-paused', paused || reduced);
  motionToggle.disabled = reduced;
  motionToggle.setAttribute('aria-pressed', String(paused || reduced));
  motionToggle.setAttribute('aria-label', reduced ? '动态效果已按系统设置静止' : paused ? '播放动态效果' : '暂停动态效果');
  motionToggle.title = motionToggle.getAttribute('aria-label');
  motionToggle.firstElementChild.textContent = paused || reduced ? 'play_arrow' : 'pause';
}
function queueFrame() { if (!frameId && ready && !stopped && !document.hidden) frameId = requestAnimationFrame(frame); }
motionToggle.addEventListener('click', () => { paused = !paused; lastT = performance.now(); updateMotionButton(); queueFrame(); });
motionQuery.addEventListener('change', e => { reduced = e.matches; paused = reduced; updateMotionButton(); lastT = performance.now(); queueFrame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frameId); frameId = 0; } else { lastT = performance.now(); queueFrame(); } });
document.getElementById('mengsuEnter').addEventListener('click', e => { if (window.parent !== window) { e.preventDefault(); window.parent.postMessage({type:'mengsu:enter'}, location.origin); } });
function freezeLoop() { stopped = true; cancelAnimationFrame(frameId); frameId = 0; }
window.addEventListener('pagehide', freezeLoop);
window.addEventListener('pageshow', () => { stopped = false; lastT = performance.now(); queueFrame(); });
updateMotionButton();
['rSparkle','rRipple','rPetals','rLight','btnReset','btnSave','motionToggle'].forEach(id => document.getElementById(id).disabled = true);''')
source = source.replace('function touchWater(px, py, big) {', 'function touchWater(px, py, big) {\n  if (!glReady || paused || reduced) return;')
source = source.replace("  cursorEl.style.opacity = 1;\n  cursorEl.style.left = e.clientX + 'px';\n  cursorEl.style.top = e.clientY + 'px';", "  if (paused || reduced) return;\n  cursorEl.style.opacity = 1;\n  cursorEl.style.transform = `translate3d(${e.clientX - 11}px, ${e.clientY - 11}px, 0) rotate(-18deg)`;")
source = source.replace("stage.addEventListener('pointerdown', (e) => touchWater(e.clientX, e.clientY, true));", "stage.addEventListener('pointerdown', (e) => { if (e.button > 0) return; stage.setPointerCapture(e.pointerId); touchWater(e.clientX, e.clientY, true); });\nstage.addEventListener('keydown', e => { if (e.code === 'Space') { e.preventDefault(); touchWater(W / 2, H / 2, true); } });")
source = source.replace("$('panelToggle').addEventListener('click', () => panelEl.classList.toggle('hidden'));\nif (window.innerWidth <= 720) panelEl.classList.add('hidden');", """function setPanelVisible(visible) { panelEl.classList.toggle('hidden', !visible); panelEl.inert = !visible; $('panelToggle').setAttribute('aria-expanded', String(visible)); }
$('panelToggle').addEventListener('click', () => setPanelVisible(panelEl.classList.contains('hidden')));
setPanelVisible(window.innerWidth > 720);""")
# Resizing a paused scene must redraw once without restarting animation.
source = source.replace('  syncPetals();\n}\nwindow.addEventListener', '  syncPetals();\n  queueFrame();\n}\nwindow.addEventListener')
source = source.replace('  syncPetals();\n});\n/*', '  syncPetals();\n  queueFrame();\n});\n/*')
source = source.replace("e => params.sparkle = +e.target.value", "e => { params.sparkle = +e.target.value; queueFrame(); }")
source = source.replace("e => params.ripple = +e.target.value", "e => { params.ripple = +e.target.value; queueFrame(); }")
source = source.replace("e => params.light = +e.target.value", "e => { params.light = +e.target.value; queueFrame(); }")
source = source.replace('params.petals = +e.target.value; syncPetals();', 'params.petals = +e.target.value; syncPetals(); queueFrame();')
# Keep image saving entirely local; do not invoke system sharing targets.
share_start = source.index('  if (navigator.canShare')
share_end = source.index("  const a = document.createElement('a');", share_start)
source = source[:share_start] + source[share_end:]
source = source.replace("'eau-de-printemps.png'", "'mengsu-water-ripples.png'")
source = re.sub(r"  const file = new File\([^\n]+\n", '', source)
source = source.replace('function frame(now) {\n  const dt = Math.min(0.05, (now - lastT) / 1000);\n  lastT = now;\n  const t = now / 1000;', '''function frame(now) {
  frameId = 0;
  if (stopped || document.hidden || !glReady) return;
  const dt = paused || reduced ? 0 : Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  elapsed += dt;
  const t = elapsed;''')
source = source.replace('  if (breathT <= 0) {', '  if (dt > 0 && breathT <= 0) {')
source = source.replace('  stepWater();', '  if (dt > 0) stepWater();')
source = source.replace('  updatePetals(dt, t);', '  if (dt > 0) updatePetals(dt, t);')
source = source.replace('  requestAnimationFrame(frame);\n}', '  if (!paused && !reduced) queueFrame();\n}')
boot_start = source.index('img.onload = () => {')
boot_end = source.index('img.src = PHOTO_SRC;', boot_start)
source = source[:boot_start] + '''function fallback(message) {
  ready = false; glReady = false; cancelAnimationFrame(frameId); frameId = 0;
  glCv.style.display = 'none'; fxCv.style.display = 'none';
  renderStatus.textContent = message;
  ['rSparkle','rRipple','rPetals','rLight','btnReset','btnSave','motionToggle'].forEach(id => $(id).disabled = true);
  window.parent.postMessage({type:'mengsu:ready'}, location.origin);
}
glCv.addEventListener('webglcontextlost', e => { e.preventDefault(); fallback('水面动态已暂停，仍可进入花屿星。'); });
img.onload = () => {
  try {
    if (!gl) throw new Error('WebGL unavailable');
    initGL(); setupPhotoTexture(img); glReady = true;
    layout(); gl.viewport(0, 0, glCv.width, glCv.height);
    ready = true;
    ['rSparkle','rRipple','rPetals','rLight','btnReset','btnSave'].forEach(id => $(id).disabled = false);
    updateMotionButton(); lastT = performance.now(); queueFrame();
    window.parent.postMessage({type:'mengsu:ready'}, location.origin);
  } catch { fallback('当前设备暂不支持水面动态，仍可进入花屿星。'); }
};
img.onerror = () => fallback('背景暂时未能载入，请刷新页面或直接进入花屿星。');
''' + source[boot_end:]
# The user removed the complete adjustment bar, including its settings trigger.
# Keep the reference defaults in params; remove the controls and their handlers.
panel_start = source.index('<button id="panelToggle"')
panel_end = source.index('<script>', panel_start)
source = source[:panel_start] + source[panel_end:]
controls_start = source.index('/* ============================ controls')
controls_end = source.index('/* ============================ main loop', controls_start)
source = source[:controls_start] + "const $ = (id) => document.getElementById(id);\n\n" + source[controls_end:]
source = source.replace("['rSparkle','rRipple','rPetals','rLight','btnReset','btnSave','motionToggle'].forEach(id => document.getElementById(id).disabled = true);", 'motionToggle.disabled = true;')
source = source.replace("['rSparkle','rRipple','rPetals','rLight','btnReset','btnSave','motionToggle'].forEach(id => $(id).disabled = true);", 'motionToggle.disabled = true;')
source = source.replace("    ['rSparkle','rRipple','rPetals','rLight','btnReset','btnSave'].forEach(id => $(id).disabled = false);\n", '')
panel_css_start = source.index('  #panel{')
panel_css_end = source.index('  #cursor{', panel_css_start)
source = source[:panel_css_start] + source[panel_css_end:]
source = re.sub(r'    #panel\{.*?    input\[type=range\]\{ width:104px; \}\n', '', source, flags=re.S)
# Keep Mengsu's own copy and navigation over the reference water experience.
source = source.replace('<title>Eau de Printemps — pastel water ripples</title>', '<title>花屿星 | Mengsu</title>')
source = re.sub(r'<header>.*?</header>', '''<header class="mengsu-header">
  <a class="mengsu-brand" href="/entry" aria-label="花屿星入口"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M23 5a12 12 0 1 0 4 18A13 13 0 0 1 23 5Z" stroke="currentColor" stroke-width="1.1"/><path d="m12 11 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" fill="currentColor"/></svg><span>花屿星</span></a>
  <nav class="mengsu-chapters" aria-label="选择梦境篇章"><button type="button" data-chapter="0" aria-pressed="true">花屿</button><button type="button" data-chapter="1" aria-pressed="false">鱼庭</button><button type="button" data-chapter="2" aria-pressed="false">星笺</button></nav>
</header>
<main class="mengsu-copy" aria-live="polite" aria-atomic="true"><h1 id="dreamTitle">深呼吸，<br>让梦境浮现……</h1><p id="dreamDescription">从这里，回到昨夜的梦。</p><a id="dreamLink" href="/capture" target="_top"><span>记下我的梦</span><span aria-hidden="true">→</span></a></main>
<aside class="mengsu-caption" id="dreamDetail">云朵缓缓经过，昨夜的片段还在。</aside>''', source, count=1, flags=re.S)
source = source.replace('ふれてみて &nbsp;·&nbsp; touch the water', '轻触水面 · 拖动泛起涟漪')
source = source.replace('</style>', '''
  /* Mengsu copy: quiet Chinese typography, with no adjustment panel. */
  body { color:#35495a; }
  .mengsu-header { top:max(24px,env(safe-area-inset-top)); left:4.6%; right:4.6%; text-align:left; display:flex; align-items:center; min-height:44px; }
  .mengsu-brand { display:inline-flex; align-items:center; gap:12px; color:inherit; text-decoration:none; pointer-events:auto; }
  .mengsu-brand svg { width:32px; height:32px; }
  .mengsu-brand span { font:500 25px/1.4 'Songti SC','STSong','SimSun',serif; letter-spacing:.04em; }
  .mengsu-chapters { position:absolute; left:50%; transform:translateX(-50%); display:flex; align-items:center; gap:16px; pointer-events:auto; }
  .mengsu-chapters button { display:flex; align-items:center; gap:10px; min-height:44px; padding:0 10px; background:none; border:0; color:inherit; font:14px/1.7 'Karla','Microsoft YaHei',sans-serif; cursor:pointer; }
  .mengsu-chapters button::before { content:''; width:4px; height:4px; border:1px solid currentColor; border-radius:50%; }
  .mengsu-chapters button[aria-pressed=true]::before { background:currentColor; }
  .mengsu-copy { position:fixed; z-index:6; top:30%; left:6.6%; width:43%; pointer-events:none; text-shadow:0 1px 12px #fff,0 1px 2px #fff; }
  .mengsu-copy h1 { font:500 clamp(30px,3.3vw,48px)/1.55 'Songti SC','STSong','SimSun',serif; letter-spacing:-.035em; white-space:pre-line; }
  .mengsu-copy p { margin-top:28px; font-size:15px; line-height:1.8; }
  #dreamLink { display:inline-flex; align-items:center; justify-content:space-between; gap:28px; min-height:44px; margin-top:34px; padding-bottom:7px; border-bottom:1px solid #50697966; color:inherit; text-decoration:none; font-size:14px; pointer-events:auto; }
  .mengsu-caption { position:fixed; z-index:6; right:5%; bottom:20%; max-width:160px; font-size:13px; line-height:1.9; text-shadow:0 1px 10px #fff,0 1px 2px #fff; pointer-events:none; }
  #mengsuEnter { top:max(24px,env(safe-area-inset-top)); right:4.6%; min-height:44px; border:0; border-radius:0; background:none; box-shadow:none; backdrop-filter:none; -webkit-backdrop-filter:none; color:inherit; font-size:14px; padding:0; gap:18px; }
  #motionToggle { top:auto; bottom:max(30px,env(safe-area-inset-bottom)); left:4.6%; }
  #hint { top:auto; left:calc(4.6% + 54px); bottom:max(39px,calc(env(safe-area-inset-bottom) + 9px)); transform:none; font:12px/1.6 'Karla','Microsoft YaHei',sans-serif; letter-spacing:0; animation:none; color:#35495a; text-shadow:0 1px 7px #fff; }
  #hint.gone { opacity:1; }
  @media(max-width:720px) {
    .mengsu-header { top:max(16px,env(safe-area-inset-top)); left:6%; right:6%; }
    .mengsu-brand span { font-size:22px; }.mengsu-brand svg { width:27px; height:27px; }
    .mengsu-chapters { top:58px; width:100%; justify-content:center; gap:14px; }
    .mengsu-chapters button { font-size:13px; }
    #mengsuEnter { top:max(16px,env(safe-area-inset-top)); bottom:auto; right:6%; left:auto; transform:none; font-size:12px; min-height:44px; }
    .mengsu-copy { top:30%; left:8%; width:84%; }.mengsu-copy h1 { font-size:34px; }
    .mengsu-copy p { font-size:13px; margin-top:20px; }#dreamLink { margin-top:26px; font-size:13px; }
    .mengsu-caption { right:8%; bottom:17%; max-width:145px; font-size:12px; }
    #motionToggle { left:6%; bottom:max(30px,env(safe-area-inset-bottom)); }
    #hint { left:calc(6% + 52px); font-size:11px; }
  }
  @media(max-height:600px) { .mengsu-copy { top:25%; }.mengsu-copy h1 { font-size:30px; }.mengsu-copy p { margin-top:12px; }#dreamLink { margin-top:14px; }.mengsu-caption { display:none; } }
</style>''', 1)
source = source.replace("window.parent.postMessage({type:'mengsu:enter'}, location.origin)", "window.parent.postMessage({type:'mengsu:enter',path:'/home'}, location.origin)")
source = source.replace("const $ = (id) => document.getElementById(id);", """const $ = (id) => document.getElementById(id);
const chapters = [
  { title:'深呼吸，\\n让梦境浮现……', description:'从这里，回到昨夜的梦。', link:'记下我的梦', path:'/capture', detail:'云朵缓缓经过，昨夜的片段还在。' },
  { title:'散落的梦，\\n也会慢慢相遇。', description:'月光落下来，照见那些熟悉的片段。', link:'翻开我的梦境', path:'/dreams', detail:'一端是白天，一端是夜晚，记忆在中间经过。' },
  { title:'听，\\n记忆正在回响。', description:'有些片段还没有答案，可以慢慢聊。', link:'和梦聊一聊', path:'/ask', detail:'你说过的话，会成为下一次回想的线索。' }
];
let requestedChapter = 0;
document.querySelectorAll('[data-chapter]').forEach(button => button.addEventListener('click', () => {
  const requested = Number(button.dataset.chapter);
  if (requested === requestedChapter) return;
  requestedChapter = requested;
  window.MengsuChapterTransition.run(() => {
  const chapter = chapters[Number(button.dataset.chapter)];
  document.querySelectorAll('[data-chapter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  $('dreamTitle').textContent = chapter.title;
  $('dreamDescription').textContent = chapter.description;
  $('dreamLink').firstElementChild.textContent = chapter.link;
  $('dreamLink').setAttribute('href', chapter.path);
  $('dreamDetail').textContent = chapter.detail;
  // Paint the incoming canvas before the browser captures its new scene.
  cancelAnimationFrame(frameId);
  frameId = 0;
  frame(performance.now());
  }, reduced || paused);
}));
$('dreamLink').addEventListener('click', e => {
  if (window.parent === window) return;
  e.preventDefault();
  window.parent.postMessage({type:'mengsu:enter',path:$('dreamLink').getAttribute('href')}, location.origin);
});
document.querySelector('.mengsu-brand').addEventListener('click', e => { e.preventDefault(); document.querySelector('[data-chapter="0"]').click(); });""")
# Chapters share the existing loop, motion controls and document lifecycle.
source = source.replace('<canvas id="fx"></canvas>', '<canvas id="fx"></canvas>\n  <canvas id="moonSchool" aria-hidden="true"></canvas>\n  <canvas id="starGalaxy" aria-hidden="true"></canvas>\n  <canvas id="starLights" aria-hidden="true"></canvas>')
source = source.replace('<script>', '<script src="moon-school.js"></script>\n<script src="star-galaxy.js"></script>\n<script src="chapter-transition.js"></script>\n<script>', 1)
source = source.replace('</style>', '''
  #stage #moonSchool { display:none; }
  .chapter-moon #stage { background:#e5e9f4; }
  .chapter-moon #stage #moonSchool { display:block; }
  .chapter-moon #gl,.chapter-moon #fx,.chapter-moon #credit { display:none!important; }
  .chapter-moon #cursor { opacity:0!important; }
  .chapter-moon body,.chapter-moon #stage,.chapter-moon :is(a,button) { cursor:none; }
  .chapter-moon.is-paused body,.chapter-moon.is-paused #stage { cursor:auto; }
  .chapter-moon.is-paused :is(a,button) { cursor:pointer; }
  .chapter-moon body { color:#284b7c; }
  .chapter-moon .mengsu-header,.chapter-moon .mengsu-header :is(a,button),.chapter-moon #mengsuEnter { cursor:pointer; }
  .chapter-moon .mengsu-copy { top:39%; left:25%; width:50%; text-align:center; text-shadow:0 1px 2px #e5e9f4; }
  .chapter-moon .mengsu-copy h1 { font-size:clamp(27px,2.7vw,40px); }
  .chapter-moon .mengsu-copy p { margin-top:20px; }
  .chapter-moon #dreamLink { margin-top:24px; }
  .chapter-moon .mengsu-caption { right:50%; bottom:11%; transform:translateX(50%); max-width:320px; width:70%; text-align:center; }
  .chapter-moon.moon-unavailable body,.chapter-moon.moon-unavailable #stage { cursor:auto; }
  .chapter-moon.moon-unavailable :is(a,button) { cursor:pointer; }
  @media(max-width:720px) {
    .chapter-moon .mengsu-copy { top:39%; left:19%; width:62%; }
    .chapter-moon .mengsu-copy h1 { font-size:27px; }
    .chapter-moon .mengsu-copy p { font-size:12px; margin-top:16px; }
    .chapter-moon #dreamLink { margin-top:18px; }
  }
  @media(max-height:600px) { .chapter-moon .mengsu-copy { top:28%; }.chapter-moon .mengsu-copy p { margin-top:10px; }.chapter-moon #dreamLink { margin-top:12px; } }
  .chapter-moon #hint { color:#284b7c; text-shadow:0 1px 7px #e5e9f4; }
  @media(prefers-reduced-motion:reduce) { .chapter-moon body,.chapter-moon #stage { cursor:auto; }.chapter-moon a,.chapter-moon button { cursor:pointer; } }
</style>''', 1)
source = source.replace('const params = { sparkle: 1, ripple: 1, petals: 5, light: 1 };', '''const params = { sparkle: 1, ripple: 1, petals: 5, light: 1 };
let activeChapter = 0;
let moonScene = null;
try { moonScene = window.MengsuMoonSchool?.create(document.getElementById('moonSchool')) || null; } catch { /* Keep the original water available if the optional school fails. */ }
let starScene = null;
try { starScene = window.MengsuStarGalaxy?.create(document.getElementById('starGalaxy'),document.getElementById('starLights')) || null; } catch { /* Other chapters and product navigation remain available. */ }
function chooseEntryChapter(index) {
  activeChapter = index;
  const isMoon = index === 1;
  const isStar = index === 2;
  document.documentElement.classList.toggle('chapter-moon', isMoon);
  document.documentElement.classList.toggle('chapter-star', isStar);
  document.documentElement.classList.toggle('moon-unavailable', isMoon && !moonScene);
  document.documentElement.dataset.scene = isMoon ? 'moon-school' : isStar ? 'star-galaxy' : 'water';
  moonScene?.setActive(isMoon);
  starScene?.setActive(isStar);
  if(isMoon) moonScene?.resize(window.innerWidth,window.innerHeight);
  if(isStar) starScene?.resize(window.innerWidth,window.innerHeight);
  document.getElementById('hint').textContent = isMoon ? '移动红鱼 · 穿过鱼群' : isStar ? '轻移鼠标 · 星河随你流转' : '轻触水面 · 拖动泛起涟漪';
  document.getElementById('stage').setAttribute('aria-label',isMoon ? '蓝色鱼群环游，红鱼随鼠标或手指转向，蓝鱼会轻轻避让' : isStar ? '旋转星尘与蓝黄双星，移动鼠标或拖动手指改变视角' : '互动水面，移动鼠标或拖动手指产生涟漪，空格键轻触水面');
  ready = isMoon ? Boolean(moonScene) : isStar ? Boolean(starScene) : glReady;
  renderStatus.textContent = isMoon && !moonScene ? '鱼群暂未载入，请刷新页面或返回花屿。' : isStar && !starScene ? '星河暂未载入，请刷新页面或选择其他篇章。' : '';
  if(ready) updateMotionButton();
  else motionToggle.disabled = true;
  lastT = performance.now();
  queueFrame();
}
function moveChapter(event) {
  if(paused||reduced)return;
  if(activeChapter===1)moonScene?.move(event.clientX,event.clientY);
  if(activeChapter===2)starScene?.move(event.clientX,event.clientY,!event.target.closest('a,button,nav'));
}
document.addEventListener('pointermove',moveChapter);
document.addEventListener('pointerdown',event=>{if(event.button===0)moveChapter(event);});
function leaveChapter(){moonScene?.leave();starScene?.leave();}
document.addEventListener('pointerleave',leaveChapter);
document.addEventListener('pointercancel',leaveChapter);
document.addEventListener('pointerup',event=>{if(event.pointerType==='touch')leaveChapter();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)starScene?.resetPointer();});
window.addEventListener('blur',()=>starScene?.resetPointer());
''')
source = source.replace('  const chapter = chapters[Number(button.dataset.chapter)];', '  const chapter = chapters[Number(button.dataset.chapter)];\n  chooseEntryChapter(Number(button.dataset.chapter));')
source = source.replace('  H = window.innerHeight;\n', '  H = window.innerHeight;\n  moonScene?.resize(W,H);\n  starScene?.resize(W,H);\n')
source = source.replace('  if (!glReady || paused || reduced) return;', '  if (activeChapter !== 0 || !glReady || paused || reduced) return;')
source = source.replace("stage.addEventListener('pointermove', (e) => {\n  if (paused || reduced) return;", "stage.addEventListener('pointermove', (e) => {\n  if (activeChapter !== 0 || paused || reduced) return;")
source = source.replace('  if (stopped || document.hidden || !glReady) return;', '  if (stopped || document.hidden || !ready) return;')
source = source.replace('  const t = elapsed;\n', '''  const t = elapsed;
  if (activeChapter === 1) {
    moonScene?.render(dt,t);
    if (!paused && !reduced) queueFrame();
    return;
  }
  if (activeChapter === 2) {
    starScene?.render(dt,t);
    if (!paused && !reduced) queueFrame();
    return;
  }
  if (!glReady) return;
''')
source = source.replace('  ready = false; glReady = false; cancelAnimationFrame(frameId); frameId = 0;', '  ready = activeChapter === 1; glReady = false; cancelAnimationFrame(frameId); frameId = 0;')
source = source.replace('  motionToggle.disabled = true;\n  window.parent.postMessage', '  motionToggle.disabled = true;\n  if (activeChapter === 1) { renderStatus.textContent = \'\'; updateMotionButton(); queueFrame(); }\n  window.parent.postMessage')
# Star-specific theme leaves the two other chapters untouched.
source = source.replace('</style>', '''
  #stage #starGalaxy,#stage #starLights { display:none; }
  .chapter-star { color-scheme:dark; }
  .chapter-star body,.chapter-star #stage { background:#030308; color:#e3e5ef; cursor:auto; }
  .chapter-star #stage #starGalaxy,.chapter-star #stage #starLights { display:block; }
  .chapter-star #gl,.chapter-star #fx,.chapter-star #credit,.chapter-star #cursor { display:none!important; }
  .chapter-star .mengsu-header,.chapter-star #mengsuEnter { color:#dfe3ef; text-shadow:0 1px 3px #030308; }
  .chapter-star .mengsu-copy { top:15%; left:20%; width:60%; text-align:center; text-shadow:0 2px 10px #030308,0 1px 2px #030308; }
  .chapter-star .mengsu-copy h1 { font-size:clamp(26px,2.4vw,34px); line-height:1.45; }
  .chapter-star .mengsu-copy p { font-size:13px; color:#babdcc; margin-top:12px; }
  .chapter-star #dreamLink { position:fixed; bottom:13%; left:50%; transform:translateX(-50%); margin:0; border-color:#e3e5ef55; color:#e3e5ef; }
  .chapter-star .mengsu-caption { right:50%; bottom:8%; width:80%; max-width:360px; text-align:center; transform:translateX(50%); color:#aeb4c6; text-shadow:0 2px 5px #030308; font-size:12px; }
  .chapter-star #hint,.chapter-star #renderStatus { color:#b4bbcf; text-shadow:0 1px 3px #030308; }
  .chapter-star #motionToggle { color:#e3e5ef; background:#111119; border-color:#383846; box-shadow:none; backdrop-filter:none; text-shadow:none; }
  .chapter-star :is(a,button,#stage):focus-visible { outline-color:#c8d8f5; }
  .chapter-star ::selection { color:#030308; background:#d5e2ff; }
  @media(max-width:720px) {
    .chapter-star .mengsu-copy { top:18%; left:8%; width:84%; }
    .chapter-star .mengsu-copy h1 { font-size:26px; }
    .chapter-star .mengsu-copy p { font-size:12px; }
    .chapter-star #dreamLink { bottom:17%; }
    .chapter-star .mengsu-caption { bottom:11%; max-width:260px; font-size:11px; }
  }
  @media(max-height:600px) { .chapter-star .mengsu-copy { top:20%; left:6%; width:30%; text-align:left; }.chapter-star #dreamLink { left:6%; bottom:24%; transform:none; }.chapter-star .mengsu-caption { display:none; } }
</style>''', 1)
source = source.replace('ready = activeChapter === 1;', 'ready = activeChapter === 1 ? Boolean(moonScene) : activeChapter === 2 ? Boolean(starScene) : false;')
source = source.replace("if (activeChapter === 1) { renderStatus.textContent = ''; updateMotionButton(); queueFrame(); }", "if (ready) { renderStatus.textContent = ''; updateMotionButton(); queueFrame(); }")
source = source.replace('    ready = true;\n', '    ready = activeChapter === 1 ? Boolean(moonScene) : activeChapter === 2 ? Boolean(starScene) : true;\n')
source = source.replace('</style>', '''
  /* No camera push or zoom: only the old and new chapter gently dissolve. */
  ::view-transition { pointer-events:none; }
  ::view-transition-group(root) { animation:none; }
  ::view-transition-old(root) { animation:chapter-fade-out 360ms cubic-bezier(.22,1,.36,1) both; mix-blend-mode:normal; }
  ::view-transition-new(root) { animation:chapter-fade-in 520ms cubic-bezier(.22,1,.36,1) both; mix-blend-mode:normal; }
  @keyframes chapter-fade-out { to { opacity:0; } }
  @keyframes chapter-fade-in { from { opacity:0; } to { opacity:1; } }
  @media(prefers-reduced-motion:reduce) {
    ::view-transition-old(root),::view-transition-new(root) { animation:none!important; }
  }
</style>''', 1)
asset = ROOT / 'qa/reference/assets/water.jpg'
if not asset.is_file():
    raise SystemExit('Missing source image: qa/reference/assets/water.jpg')
font_css = target / 'assets/fonts.css'
if not font_css.is_file():
    raise SystemExit('Missing localized font stylesheet: entry-ripples/assets/fonts.css')
for url in re.findall(r'url\(([^)]+)\)', font_css.read_text(encoding='utf-8')):
    if not (font_css.parent / url.strip('"\'')).is_file():
        raise SystemExit(f'Missing localized font: {url}')
shutil.copy2(asset, target / 'assets/water.jpg')
(target / 'index.html').write_text(source, encoding='utf-8')
print('Localized entry written:', target / 'index.html')
