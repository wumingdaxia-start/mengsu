import * as T from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { gsap } from 'gsap'

export async function createDreamStage(canvas, { onReady, onError, reducedMotion = false, onDrag, signal, imageEntrance = false, onOrbit } = {}) {
  let renderer
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch (error) { onError?.(); return null }
  let disposed = false
  function abortInitialization() { disposed = true; renderer.dispose() }
  signal?.addEventListener('abort', abortInitialization, { once: true })
  if (signal?.aborted) abortInitialization()
  if (disposed) { signal?.removeEventListener('abort', abortInitialization); return null }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
  renderer.outputColorSpace = T.SRGBColorSpace
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.25
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = T.PCFShadowMap
  const scene = new T.Scene()
  const camera = new T.PerspectiveCamera(37, 1, .1, 100)
  camera.position.set(0, 3, 16)
  camera.lookAt(0, .4, 0)
  scene.add(new T.HemisphereLight('#c3e6e8', '#6c7363', 2.3))
  const sun = new T.DirectionalLight('#ffe1af', 3.6)
  sun.position.set(-6, 10, 8);sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 12, bottom: -8, near: 1, far: 40 })
  sun.shadow.normalBias = .025
  scene.add(sun)
  const rim = new T.DirectionalLight('#a1d9db', 1.6);rim.position.set(6, 3, -5);scene.add(rim)
  const loader = new GLTFLoader()
  let models
  try {
    const gltf = await loader.loadAsync('/models/dream-worlds.glb')
    const planet = gltf.scene.getObjectByName('Dream_planet'), islands = gltf.scene.getObjectByName('Cloud_castles')
    if (!planet || !islands) throw new Error('Missing world groups')
    models = { planet, islands }
  } catch {
    if (disposed) return null
    const { createWorlds } = await import('./worlds.js')
    models = createWorlds()
  }
  if (disposed) {
    const geometries = new Set(), materials = new Set()
    Object.values(models).forEach(root => root.traverse(o => {
      if (o.geometry) geometries.add(o.geometry)
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m))
    }))
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose())
    signal?.removeEventListener('abort', abortInitialization)
    return null
  }
  signal?.removeEventListener('abort', abortInitialization)
  const roots = [models.planet, models.islands]
  roots.forEach(root => {
    root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
    scene.add(root)
  })
  const moon = new T.Group()
  const crescent = new T.Shape()
  crescent.absarc(0, 0, .48, Math.PI / 2, Math.PI * 1.5, false)
  crescent.bezierCurveTo(-.28, -.4, -.28, .4, 0, .48)
  const moonMesh = new T.Mesh(new T.ShapeGeometry(crescent, 40), new T.MeshBasicMaterial({ color: '#eddfb7', side: T.DoubleSide }))
  moon.add(moonMesh); moon.rotation.z = -.35;moon.position.set(5.1, 3.5, -4);scene.add(moon)

  const pointTexture = (() => {
    const el = document.createElement('canvas');el.width = el.height = 64
    const ctx = el.getContext('2d'), g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0, 'rgba(255,255,255,1)');g.addColorStop(.14, 'rgba(255,255,255,.9)');g.addColorStop(.42, 'rgba(255,255,255,.17)');g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g;ctx.fillRect(0, 0, 64, 64)
    return new T.CanvasTexture(el)
  })()
  function points(count, spread) {
    const geometry = new T.BufferGeometry(), positions = [], colours = []
    for (let i = 0; i < count; i++) {
      const r = (n) => { const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x) }
      positions.push((r(1) - .5) * spread, (r(2) - .5) * spread * .7, -5 - r(3) * 10)
      const c = new T.Color(i % 5 ? '#b3d2cf' : '#e6c48c');colours.push(c.r, c.g, c.b)
    }
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('color', new T.Float32BufferAttribute(colours, 3))
    return new T.Points(geometry, new T.PointsMaterial({ map: pointTexture, size: .13, transparent: true, opacity: .6, depthWrite: false, vertexColors: true, blending: T.AdditiveBlending }))
  }
  const stars = points(1050, 38);scene.add(stars)
  const poolGeometry = new T.BufferGeometry(), poolPoints = []
  for (let i = 0; i < 320; i++) {
    const a = i * 2.39996, r = Math.sqrt(i / 320) * 1.05
    poolPoints.push(Math.cos(a) * r, .17 + Math.sin(i * 4.3) ** 2 * .12, Math.sin(a) * r)
  }
  poolGeometry.setAttribute('position', new T.Float32BufferAttribute(poolPoints, 3))
  const pool = new T.Points(poolGeometry, new T.PointsMaterial({ map: pointTexture, size: .07, color: '#dae7ff', transparent: true, opacity: .85, depthWrite: false, blending: T.AdditiveBlending }))
  pool.position.set(2.25, .55, -1.1);pool.scale.setScalar(.85);models.islands.add(pool)

  // The flow is a real 3D particle ribbon, not a video or background image.
  const count = window.innerWidth < 600 ? 8500 : 16500
  const geometry = new T.BufferGeometry(), seeds = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) { seeds[i * 3] = i / count;seeds[i * 3 + 1] = Math.sin(i * 123.45) * .5 + .5;seeds[i * 3 + 2] = Math.cos(i * 72.31) * .5 + .5 }
  geometry.setAttribute('position', new T.BufferAttribute(seeds, 3))
  const flowMaterial = new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uAlpha: { value: 0 }, uTouch: { value: new T.Vector2() }, uPixelRatio: { value: renderer.getPixelRatio() } },
    vertexShader: `uniform float uTime; uniform vec2 uTouch; uniform float uPixelRatio; varying float vLight; varying float vSide;
    void main(){float u=position.x;float v=position.y;float n=position.z;float phase=u*15.0-uTime*.32;float a=sin(u*3.14159)*1.8+.22;
    vec3 p=vec3((u-.5)*17.0, sin(phase)*a+(v-.5)*1.8*cos(phase*.6),cos(phase)*a+(v-.5)*2.6);
    p.y+=sin(u*5.0+uTime*.18)*.45+uTouch.y*u*.5;p.z+=uTouch.x*u*.8;
    vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((1.+n*2.1)*uPixelRatio*14./-mv.z,1.4,6.);
    vLight=.35+pow(n,5.)*.65;vSide=u;}`,
    fragmentShader: `uniform float uAlpha; varying float vLight; varying float vSide; void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,.05,d)*vLight*uAlpha;vec3 c=mix(vec3(.42,.72,.72),vec3(.93,.84,.61),pow(vSide,3.));gl_FragColor=vec4(c,a);}`
  })
  const flow = new T.Points(geometry, flowMaterial); flow.position.set(1, -.5, 0);scene.add(flow)
  const strands = new T.Group();scene.add(strands)
  for (let i = 0; i < 12; i++) {
    const pts = []
    for (let k = 0; k <= 150; k++) {
      const u = k / 150, phase = u * 15, a = Math.sin(u * Math.PI) * 1.8 + .22, v = i / 11
      pts.push(new T.Vector3((u - .5) * 17, Math.sin(phase) * a + (v - .5) * 1.8 * Math.cos(phase * .6) - .5, Math.cos(phase) * a + (v - .5) * 2.6))
    }
    const g = new T.BufferGeometry().setFromPoints(pts), m = new T.LineBasicMaterial({ color: '#99d6ce', transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending })
    strands.add(new T.Line(g, m))
  }
  const sails = scene.getObjectByName('Windmill_sails')
  const transition = { blend: 0 }
  const crystals = []; models.islands.traverse(o => { if (o.name?.startsWith('Floating_crystal')) crystals.push(o) })
  let chapter = 0, yaw = -.08, targetYaw = -.08, tilt = 0, targetTilt = 0
  let paused = reducedMotion, reduce = reducedMotion, frame = 0, lastTime = 0, clock = 0, drag = null, needsFrame = true, exiting = 0, mobile = false
  function resize() {
    const { width, height } = canvas.getBoundingClientRect();if (!width || !height) return
    mobile = width < 700
    renderer.setSize(width, height, false);camera.aspect = width / height
    camera.fov = mobile ? 46 : 37;camera.updateProjectionMatrix()
    needsFrame = true;wake()
  }
  function weights(t) { return [Math.max(0, 1 - Math.abs(t)), Math.max(0, 1 - Math.abs(t - 1)), Math.max(0, 1 - Math.abs(t - 2))] }
  function draw(now) {
    frame = 0
    if (disposed || document.hidden) return
    const dt = Math.min((now - (lastTime || now)) / 1000, .05);lastTime = now
    if (!paused && !reduce) clock += dt
    yaw += (targetYaw - yaw) * (reduce ? 1 : 1 - Math.exp(-dt * 9))
    tilt += (targetTilt - tilt) * (reduce ? 1 : 1 - Math.exp(-dt * 9))
    onOrbit?.(yaw, tilt)
    const w = weights(transition.blend), bob = reduce ? 0 : Math.sin(clock * .48) * .045
    models.planet.position.set(mobile ? 0 : 2.2, (mobile ? -2.9 : -2.62) - (1 - w[0]) * 6 + bob, 0)
    models.planet.rotation.set(tilt, yaw, .035)
    models.planet.scale.setScalar(.98 - (1 - w[0]) * .3)
    models.planet.visible = !imageEntrance && w[0] > .002
    models.islands.position.set(mobile ? 0 : 1.65, (mobile ? -1.9 : -.75) + (1 - w[1]) * 6 + bob, 0)
    models.islands.rotation.set(tilt * .4, yaw * .7 + .08, 0)
    models.islands.scale.setScalar(mobile ? .78 : 1.05)
    models.islands.visible = w[1] > .002
    if (!paused && !reduce) crystals.forEach(o => { o.rotation.y += dt * .12 })
    if (sails && !paused && !reduce) sails.rotation.z += dt * .12
    stars.rotation.z = reduce ? 0 : Math.sin(clock * .025) * .015
    stars.material.opacity = .55 * (1 - w[1] * .88) * (imageEntrance ? 1 - w[0] : 1)
    moon.visible = !imageEntrance && w[0] > .02;moon.scale.setScalar(.6 + w[0] * .4)
    flow.visible = w[2] > .001;flowMaterial.uniforms.uTime.value = clock;flowMaterial.uniforms.uAlpha.value = w[2] * .9
    flowMaterial.uniforms.uTouch.value.set(yaw, tilt)
    flow.position.set(mobile ? 0 : 1.5, mobile ? -1.7 : -.55, 0)
    flow.rotation.z = mobile ? -.5 : -.1
    flow.scale.setScalar(mobile ? .7 : .92)
    strands.visible = flow.visible;strands.position.copy(flow.position).add(new T.Vector3(-1, .5, 0));strands.rotation.copy(flow.rotation);strands.scale.copy(flow.scale)
    strands.children.forEach(o => { o.material.opacity = w[2] * .095 })
    camera.position.z = (mobile ? 16.8 : 15.5) - exiting * 5
    camera.position.y = 3 - exiting * .8
    renderer.render(scene, camera)
    needsFrame = false
    if ((!paused && !reduce) || Math.abs(chapter - transition.blend) > .001 || Math.abs(targetYaw - yaw) > .001 || Math.abs(targetTilt - tilt) > .001) wake()
  }
  function wake() { if (!frame && !disposed && !document.hidden) frame = requestAnimationFrame(draw) }
  function visibility() { if (document.hidden) { cancelAnimationFrame(frame);frame = 0;lastTime = 0 } else { lastTime = 0;wake() } }
  const resizeObserver = new ResizeObserver(resize);resizeObserver.observe(canvas)
  document.addEventListener('visibilitychange', visibility)
  function pointerDown(event) {
    if (event.button > 0) return
    drag = { x: event.clientX, y: event.clientY, yaw: targetYaw, tilt: targetTilt, moved: false }
    canvas.setPointerCapture(event.pointerId)
  }
  function pointerMove(event) {
    if (!drag) return
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y
    if (Math.hypot(dx, dy) > 8) { drag.moved = true;onDrag?.() }
    targetYaw = drag.yaw + dx * .004
    targetTilt = T.MathUtils.clamp(drag.tilt + dy * .001, -.18, .18)
    wake()
  }
  function pointerUp() { drag = null }
  canvas.addEventListener('pointerdown', pointerDown);canvas.addEventListener('pointermove', pointerMove);canvas.addEventListener('pointerup', pointerUp);canvas.addEventListener('pointercancel', pointerUp)
  resize();wake();onReady?.()
  return {
    setChapter(value, immediate = false) {
      chapter = value;gsap.killTweensOf(transition)
      if (immediate || reduce) transition.blend = value
      else gsap.to(transition, { blend: value, duration: .9, ease: 'power3.out', overwrite: true, onUpdate: wake })
      needsFrame = true;wake()
    },
    setPaused(value) { paused = value;needsFrame = true;wake() },
    setReduced(value) { reduce = value;if (value) { gsap.killTweensOf(transition);transition.blend = chapter }needsFrame = true;wake() },
    setExit(value) { exiting = value;wake() },
    rotate(amount, immediate = false) { targetYaw += amount;if (immediate || reduce) yaw = targetYaw;wake() },
    dispose() {
      disposed = true;gsap.killTweensOf(transition);cancelAnimationFrame(frame);resizeObserver.disconnect();document.removeEventListener('visibilitychange', visibility)
      canvas.removeEventListener('pointerdown', pointerDown);canvas.removeEventListener('pointermove', pointerMove);canvas.removeEventListener('pointerup', pointerUp);canvas.removeEventListener('pointercancel', pointerUp)
      const geometries = new Set(), materials = new Set()
      scene.traverse(o => { if (o.geometry) geometries.add(o.geometry);if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)) })
      geometries.forEach(g => g.dispose());materials.forEach(m => m.dispose());pointTexture.dispose();renderer.dispose()
    }
  }
}
