import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from '../frontend/node_modules/three/build/three.module.js'
import { GLTFExporter } from '../frontend/node_modules/three/examples/jsm/exporters/GLTFExporter.js'
import { mergeGeometries } from '../frontend/node_modules/three/examples/jsm/utils/BufferGeometryUtils.js'
import { createWorlds } from '../frontend/src/scene/worlds.js'

// No textures are external: this shim supports the binary exporter in Node.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(buffer => { this.result = buffer; this.onloadend?.() }) }
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const scene = new THREE.Scene()
const { planet, islands } = createWorlds()
scene.add(planet, islands)
const exporter = new GLTFExporter()
const source = await exporter.parseAsync(scene, { binary: true, onlyVisible: false })
await fs.mkdir(path.join(root, 'scene-source'), { recursive: true })
await fs.writeFile(path.join(root, 'scene-source/dream-worlds.source.glb'), Buffer.from(source))
// Merge only static web meshes. The source GLB above preserves every editable part.
for (const world of [planet, islands]) {
  world.updateMatrixWorld(true)
  const byMaterial = new Map(), originals = []
  world.traverse(object => {
    if (!object.isMesh) return
    for (let node = object; node && node !== world; node = node.parent) {
      if (node.name === 'Windmill_sails' || node.name.startsWith('Floating_crystal')) return
    }
    const geo = object.geometry.clone().applyMatrix4(object.matrixWorld)
    if (!byMaterial.has(object.material)) byMaterial.set(object.material, [])
    byMaterial.get(object.material).push(geo)
    originals.push(object)
  })
  originals.forEach(o => o.removeFromParent())
  for (const [material, list] of byMaterial) {
    const merged = mergeGeometries(list)
    if (!merged) throw new Error('Static scene batching failed')
    const mesh = new THREE.Mesh(merged, material)
    mesh.name = `${world.name}_surface_${material.color.getHexString()}`
    world.add(mesh)
    list.forEach(g => g.dispose())
  }
}
const glb = await exporter.parseAsync(scene, { binary: true, onlyVisible: false })
const out = path.join(root, 'frontend/public/models/dream-worlds.glb')
await fs.mkdir(path.dirname(out), { recursive: true })
await fs.writeFile(out, Buffer.from(glb))
console.log(`Authored scene exported: ${out}, ${glb.byteLength} bytes`)
