"""Run with official Blender --background --python scripts/assemble_blender.py.

The imported, locally authored GLB retains individual named objects. No cloud
generation is represented by this file. Browser shaders remain in the web code.
"""
from pathlib import Path
from math import sin, cos, pi
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'scene-source'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(OUT / 'dream-worlds.source.glb'))

planet = bpy.data.objects['Dream_planet']
islands = bpy.data.objects['Cloud_castles']
planet.location.x = -4.3
islands.location.x = 4.7

# An editable still of the web shader's ribbons, kept as separate Blender curves.
flow = bpy.data.objects.new('Memory_light_sea', None)
bpy.context.collection.objects.link(flow)
flow.location = (0, 7, 1.2)
glow = bpy.data.materials.new('Lagoon memory light')
glow.diffuse_color = (.4, .8, .73, 1)
glow.use_nodes = True
shader = glow.node_tree.nodes.get('Principled BSDF')
shader.inputs['Base Color'].default_value = (.4, .8, .73, 1)
shader.inputs['Emission Color'].default_value = (.4, .8, .73, 1)
shader.inputs['Emission Strength'].default_value = 2
for strand in range(16):
    data = bpy.data.curves.new(f'Memory ribbon {strand + 1:02}', 'CURVE')
    data.dimensions = '3D'
    data.bevel_depth = .009
    data.bevel_resolution = 2
    spline = data.splines.new('POLY')
    spline.points.add(160)
    v = strand / 15
    for step, point in enumerate(spline.points):
        u = step / 160
        phase, amplitude = u * 15, sin(u * pi) * 1.8 + .22
        point.co = ((u - .5) * 15, cos(phase) * amplitude + (v - .5) * 2.6,
                    sin(phase) * amplitude + (v - .5) * 1.8 * cos(phase * .6), 1)
    ob = bpy.data.objects.new(data.name, data)
    bpy.context.collection.objects.link(ob)
    ob.parent = flow
    data.materials.append(glow)

for ob in list(bpy.context.scene.objects):
    if ob.type == 'MESH':
        # Preserve faceted rock and the tiny round pieces; soften masonry edges.
        if len(ob.data.vertices) <= 32 and 'rock' not in ob.name.lower():
            modifier = ob.modifiers.new('Hand-finished edges', 'BEVEL')
            modifier.width = .012
            modifier.segments = 2

world = bpy.data.worlds.new('Midnight teal atmosphere')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (.055, .10, .12, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = .45
bpy.context.scene.world = world

def light(name, location, energy, color, size):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy, data.color, data.shape, data.size = energy, color, 'DISK', size
    ob = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(ob)
    ob.location = location
    ob.rotation_euler = (Vector((0, 0, 1)) - ob.location).to_track_quat('-Z', 'Y').to_euler()

light('Warm moon key', (-6, -8, 12), 1800, (1, .84, .62), 8)
light('Cloud rim', (7, 3, 8), 1300, (.61, .84, .89), 6)
bpy.ops.object.camera_add(location=(13, -24, 16))
camera = bpy.context.object
camera.name = 'Scene overview camera'
camera.rotation_euler = (Vector((0, 0, .5)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.lens = 48
bpy.context.scene.camera = camera
bpy.context.scene.render.resolution_x = 1920
bpy.context.scene.render.resolution_y = 1080
bpy.context.scene.render.resolution_percentage = 100

# Open directly in the authored overview, with clear scene navigation.
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.region_3d.view_distance = 22
            area.spaces.active.region_3d.view_location = (0, 0, .6)
            area.spaces.active.shading.type = 'MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'mengsu-dream-worlds.blend'))
print('BLENDER_SOURCE_SAVED', bpy.app.version_string, len(bpy.context.scene.objects))
