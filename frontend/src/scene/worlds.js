import * as T from 'three'

// Editable parts, shared by the browser and the GLB / Blender production script.
// Dimensions are metres; Y is up. All scenery is authored locally, not Lux3D output.
export function createWorlds() {
  const palette = {
    sand: '#c6bc8e', edge: '#7d8263', wall: '#ecdfba', roof: '#af6250',
    roofDark: '#45716d', wood: '#785f45', gold: '#c6a779', leaf: '#718d64',
    leafLight: '#a5b581', ink: '#24434b', window: '#eac783', stone: '#b3ada0'
  }
  const materials = new Map()
  function mat(color, extra = {}) {
    const key = color + JSON.stringify(extra)
    if (!materials.has(key)) materials.set(key, new T.MeshStandardMaterial({ color, roughness: .83, ...extra }))
    return materials.get(key)
  }
  function part(parent, name, geometry, material, position = [0, 0, 0], scale) {
    const mesh = new T.Mesh(geometry, typeof material === 'string' ? mat(material) : material)
    mesh.name = name
    mesh.position.set(...position)
    if (scale) mesh.scale.set(...scale)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
    return mesh
  }
  const box = (p, n, size, c, pos) => part(p, n, new T.BoxGeometry(...size), c, pos)
  const ball = (p, n, r, c, pos, scale) => part(p, n, new T.SphereGeometry(r, 24, 16), c, pos, scale)
  const cyl = (p, n, rt, rb, h, c, pos, segments = 24) => part(p, n, new T.CylinderGeometry(rt, rb, h, segments), c, pos)
  function beam(p, n, a, b, r, c) {
    const start = new T.Vector3(...a), end = new T.Vector3(...b)
    const m = cyl(p, n, r, r, start.distanceTo(end), c)
    m.position.copy(start.clone().add(end).multiplyScalar(.5))
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), end.sub(start).normalize())
    return m
  }
  const glow = mat(palette.window, { emissive: '#f6cb78', emissiveIntensity: .65 })
  const dark = mat(palette.ink)
  const roofmat = mat(palette.roof)
  const windowFrame = (p, x, y, z, s = 1) => {
    box(p, 'Window frame', [.28 * s, .38 * s, .055], palette.wood, [x, y, z])
    box(p, 'Warm window', [.21 * s, .3 * s, .065], glow, [x, y, z + .015])
    box(p, 'Window mullion', [.025, .3 * s, .08], palette.wall, [x, y, z + .025])
    box(p, 'Window crossbar', [.21 * s, .025, .08], palette.wall, [x, y, z + .025])
  }
  function house() {
    const g = new T.Group(); g.name = 'Capture_cottage'
    box(g, 'Plaster walls', [.95, .98, .8], palette.wall, [0, .49, 0])
    box(g, 'Stone footing', [1.04, .12, .9], palette.stone, [0, .06, 0])
    const roof = cyl(g, 'Slate hipped roof', .82, .82, .12, palette.roofDark, [0, 1.01, 0], 4)
    roof.rotation.y = Math.PI / 4
    const geometry = new T.ConeGeometry(.82, .57, 4)
    const cone = part(g, 'Roof', geometry, palette.roofDark, [0, 1.32, 0]); cone.rotation.y = Math.PI / 4
    box(g, 'Chimney', [.17, .65, .2], palette.wall, [.28, 1.4, -.13])
    box(g, 'Chimney cap', [.23, .07, .25], palette.wood, [.28, 1.74, -.13])
    box(g, 'Door', [.26, .55, .03], palette.wood, [.22, .33, .412])
    ball(g, 'Brass handle', .02, palette.gold, [.29, .33, .44])
    windowFrame(g, -.2, .64, .415, .85)
    for (let i = 0; i < 3; i++) box(g, 'Door step', [.46, .07, .2], palette.stone, [.22, .08 - i * .035, .52 + i * .15])
    return g
  }
  function lighthouse() {
    const g = new T.Group(); g.name = 'Memory_lighthouse'
    cyl(g, 'Tower base', .4, .49, .16, palette.stone, [0, .08, 0])
    cyl(g, 'Ivory tower', .22, .35, 1.55, palette.wall, [0, .9, 0], 12)
    for (let i = 0; i < 3; i++) windowFrame(g, 0, .5 + i * .38, .29 - i * .025, .46)
    cyl(g, 'Lantern floor', .36, .36, .07, palette.wood, [0, 1.7, 0])
    cyl(g, 'Lantern glass', .25, .25, .38, mat('#a5d5cb', { transparent: true, opacity: .35, roughness: .16, metalness: .1 }), [0, 1.93, 0])
    ball(g, 'Beacon', .12, glow, [0, 1.93, 0])
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2
      cyl(g, 'Lantern strut', .017, .017, .44, palette.wood, [Math.cos(a) * .26, 1.93, Math.sin(a) * .26])
    }
    part(g, 'Copper lantern roof', new T.ConeGeometry(.39, .34, 12), roofmat, [0, 2.3, 0])
    cyl(g, 'Finial', .018, .018, .22, palette.gold, [0, 2.55, 0])
    return g
  }
  function windmill() {
    const g = new T.Group(); g.name = 'Listening_windmill'
    cyl(g, 'Mill body', .21, .36, 1.2, palette.wall, [0, .6, 0], 8)
    part(g, 'Mill roof', new T.ConeGeometry(.4, .48, 8), palette.roofDark, [0, 1.43, 0])
    windowFrame(g, 0, .55, .31, .6)
    const wheel = new T.Group(); wheel.name = 'Windmill_sails'; wheel.position.set(0, 1.22, .4); g.add(wheel)
    for (let i = 0; i < 4; i++) {
      const blade = new T.Group(); blade.rotation.z = i * Math.PI / 2 + .3; wheel.add(blade)
      box(blade, 'Sail spar', [.035, .84, .045], palette.wood, [0, .37, 0])
      box(blade, 'Linen sail', [.22, .54, .018], palette.wall, [.095, .51, .025])
      for (let j = 0; j < 4; j++) box(blade, 'Sail batten', [.24, .018, .035], palette.wood, [.095, .28 + j * .15, .04])
    }
    ball(wheel, 'Hub', .08, palette.gold, [0, 0, .055])
    return g
  }
  function tree(s = 1, pink = false) {
    const g = new T.Group(); g.name = 'Garden_tree'
    cyl(g, 'Trunk', .045, .075, .7, palette.wood, [0, .35, 0])
    beam(g, 'Branch', [0, .42, 0], [.2, .76, 0], .035, palette.wood)
    const c = pink ? '#b98e8e' : palette.leaf
    ball(g, 'Leaf crown', .37, c, [0, .92, 0], [.9, 1.15, .9])
    ball(g, 'Leaf crown side', .28, pink ? '#d0a4a1' : palette.leafLight, [.2, .78, .08])
    g.scale.setScalar(s)
    return g
  }
  function traveller() {
    const g = new T.Group(); g.name = 'Dream_traveller'
    box(g, 'Coat', [.16, .27, .11], '#b7b89c', [0, .32, 0])
    ball(g, 'Head', .09, '#e4c8a0', [0, .55, 0])
    box(g, 'Scarf', [.19, .042, .145], palette.roof, [0, .45, 0])
    const scarf = box(g, 'Trailing scarf', [.33, .045, .035], palette.roof, [.2, .43, -.025]); scarf.rotation.z = -.12
    beam(g, 'Left leg', [-.04, .2, 0], [-.075, .04, .04], .022, palette.ink)
    beam(g, 'Right leg', [.04, .2, 0], [.11, .04, -.03], .022, palette.ink)
    const cap = part(g, 'Soft cap', new T.ConeGeometry(.13, .21, 12), palette.roofDark, [0, .69, 0]); cap.rotation.z = -.2
    return g
  }
  function surface(parent, object, longitude, latitude, radius = 3.1) {
    const normal = new T.Vector3(Math.sin(longitude) * Math.cos(latitude), Math.cos(longitude) * Math.cos(latitude), Math.sin(latitude))
    object.position.copy(normal.clone().multiplyScalar(radius))
    object.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), normal)
    parent.add(object)
    return object
  }
  const planet = new T.Group(); planet.name = 'Dream_planet'
  const globeGeo = new T.SphereGeometry(3.1, 96, 64)
  const colours = [], p = globeGeo.attributes.position, c = new T.Color()
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const n = Math.sin(x * 3.2 + z * 2.1) * Math.cos(y * 3.6 - z) * .025 + Math.sin(x * 13 + y * 18 + z * 7) * .008
    c.set(palette.sand).offsetHSL(0, n * .2, n)
    colours.push(c.r, c.g, c.b)
  }
  globeGeo.setAttribute('color', new T.Float32BufferAttribute(colours, 3))
  part(planet, 'Sandy planet', globeGeo, mat('#ffffff', { vertexColors: true }))
  surface(planet, house(), -.58, .18)
  surface(planet, lighthouse(), .12, -.24)
  surface(planet, windmill(), .65, .06)
  surface(planet, traveller(), -.07, .44)
  for (const [a, b, s, pink] of [[-.84, -.18, .8, false], [-.32, -.35, .8, true], [.38, -.36, .65, false], [.9, -.16, .6, false], [-.8, .32, .5, false]]) surface(planet, tree(s, pink), a, b)
  // A path which follows the real spherical ground rather than intersecting it.
  for (let i = 0; i < 17; i++) {
    const stone = new T.Mesh(new T.SphereGeometry(.075, 9, 5), mat('#b4ab8c'))
    stone.name = 'Footpath stone'; stone.scale.set(1.3, .22, .9)
    surface(planet, stone, -.45 + i * .057, .4 + Math.sin(i * .25) * .08, 3.12)
  }
  for (let i = 0; i < 55; i++) {
    const a = i * 2.39996, h = Math.sin(i * 8.4)
    const pebble = new T.Mesh(new T.IcosahedronGeometry(.025 + (i % 5) * .007, 0), mat(i % 3 ? '#a7a184' : '#8d9375'))
    pebble.name = 'Surface pebble'
    surface(planet, pebble, a, h * 1.1, 3.108)
  }
  // Low rope fence behind the little buildings.
  let previous
  for (let i = 0; i < 15; i++) {
    const a = -.86 + i * .126, lat = -.16
    const normal = new T.Vector3(Math.sin(a) * Math.cos(lat), Math.cos(a) * Math.cos(lat), Math.sin(lat))
    const bottom = normal.clone().multiplyScalar(3.1), top = normal.clone().multiplyScalar(3.26)
    beam(planet, 'Fence post', bottom.toArray(), top.toArray(), .013, palette.wood)
    if (previous) beam(planet, 'Fence rope', previous, top.toArray(), .007, '#d1c7a8')
    previous = top.toArray()
  }

  const islands = new T.Group(); islands.name = 'Cloud_castles'
  function floatingIsland(name, position, scale = 1) {
    const g = new T.Group(); g.name = name; g.position.set(...position); g.scale.setScalar(scale)
    const rock = cyl(g, 'Faceted suspended rock', 1.6, .25, 1.7, '#6b8280', [0, -.85, 0], 11)
    const vertices = rock.geometry.attributes.position
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i)
      const radial = 1 + Math.sin(x * 4.3 + z * 1.7) * .11
      vertices.setXYZ(i, x * radial, y + (y < 0 ? Math.sin(x * 2.7 + z * 3.4) * -.22 : 0), z * radial)
    }
    rock.geometry.computeVertexNormals()
    ball(g, 'Island turf', 1, '#8da283', [0, -.03, 0], [1.65, .22, 1.4])
    const base = cyl(g, 'Stone island rim', 1.58, 1.59, .1, palette.stone, [0, -.12, 0], 48); base.scale.z = .86
    islands.add(g)
    return g
  }
  const garden = floatingIsland('Garden_castle_island', [-2, -.05, .25], 1)
  function tower(p, x, y, z, height, radius, roofColor = palette.roof) {
    const g = new T.Group(); g.name = 'Castle_turret'; g.position.set(x, y, z); p.add(g)
    cyl(g, 'Limestone tower', radius, radius * 1.08, height, palette.wall, [0, height / 2, 0], 20)
    cyl(g, 'Cornice', radius * 1.18, radius * 1.18, .08, '#d3c5a6', [0, height, 0], 20)
    part(g, 'Copper spire', new T.ConeGeometry(radius * 1.4, radius * 2.5, 20), roofColor, [0, height + radius * 1.23, 0])
    windowFrame(g, 0, height * .64, radius + .009, radius * 1.6)
    if (height > 1) windowFrame(g, 0, height * .28, radius + .009, radius * 1.4)
    cyl(g, 'Spire pole', .012, .012, .23, palette.gold, [0, height + radius * 2.6, 0])
    return g
  }
  box(garden, 'Castle hall', [1.15, .85, .7], palette.wall, [-.1, .43, -.1])
  const roof = part(garden, 'Hall roof', new T.ConeGeometry(.91, .56, 4), palette.roof, [-.1, 1.1, -.1]); roof.rotation.y = Math.PI / 4
  tower(garden, -.73, .05, .28, 1.2, .24)
  tower(garden, .52, .04, .23, 1.65, .26)
  tower(garden, -.12, .1, -.55, 2.15, .32, palette.roofDark)
  windowFrame(garden, -.1, .51, .265, 1)
  box(garden, 'Arch door', [.22, .43, .05], palette.wood, [.22, .23, .28])
  for (const [x, z, s] of [[-1.1, -.15, .7], [.9, -.43, .75], [-.9, .7, .45], [.4, -.95, .55]]) {
    const t = tree(s);t.position.set(x, .03, z);garden.add(t)
  }
  for (let i = 0; i < 15; i++) {
    const a = i * 2.4
    ball(garden, 'Garden flowers', .04, i % 2 ? '#d1b1ad' : '#ead1a1', [Math.cos(a) * 1.25, .14, Math.sin(a) * .95])
  }
  const stars = floatingIsland('Star_garden_island', [2.25, .55, -1.1], .85)
  cyl(stars, 'Star pool', 1.31, 1.31, .08, mat('#283f61', { metalness: .3, roughness: .23 }), [0, .12, 0], 64)
  for (let i = 0; i < 22; i++) {
    const a = i / 21 * Math.PI * 1.48 + .06
    box(stars, 'Garden wall stone', [.3, .3 + (i % 2) * .1, .18], palette.wall, [Math.cos(a) * 1.43, .22, Math.sin(a) * 1.18]).rotation.y = -a + Math.PI / 2
  }
  const arch = part(stars, 'Star_gate', new T.TorusGeometry(.58, .048, 12, 64, Math.PI), palette.gold, [.05, .66, -.36]); arch.rotation.z = 0
  for (let i = 0; i < 7; i++) {
    const crystal = part(stars, 'Floating_crystal', new T.OctahedronGeometry(.08 + (i % 3) * .035), mat('#c8e6dc', { metalness: .32, roughness: .2 }), [Math.cos(i * 2.4) * .9, .65 + (i % 4) * .24, Math.sin(i * 2.4) * .7])
    crystal.rotation.set(i * .4, i * .5, .2)
  }
  const bridgeCurve = new T.CatmullRomCurve3([new T.Vector3(-.43, .1, .25), new T.Vector3(.45, .02, -.15), new T.Vector3(1.08, .58, -.66)])
  for (let i = 0; i < 23; i++) {
    const t = i / 22, p = bridgeCurve.getPoint(t), tangent = bridgeCurve.getTangent(t)
    const board = box(islands, 'Bridge timber', [.12, .045, .42], '#c8b18b', p.toArray()); board.rotation.y = -Math.atan2(tangent.z, tangent.x)
    if (i % 4 === 0) {
      for (const side of [-1, 1]) beam(islands, 'Bridge rail post', [p.x, p.y, p.z + side * .2], [p.x, p.y + .28, p.z + side * .2], .012, palette.wood)
    }
  }
  for (const z of [-.2, .2]) {
    const curve = new T.CatmullRomCurve3(bridgeCurve.points.map(p => p.clone().add(new T.Vector3(0, .27, z))))
    part(islands, 'Bridge rope', new T.TubeGeometry(curve, 36, .009, 5, false), palette.wood)
  }
  const runner = traveller();runner.position.copy(bridgeCurve.getPoint(.48));runner.scale.setScalar(.75);runner.rotation.y = -.7;islands.add(runner)
  return { planet, islands }
}
