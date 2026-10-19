"""Locally authored dream environments; official Blender 5.2, no cloud assets.

Run: blender --background --python scripts/render_dream_rooms.py
"""
from pathlib import Path
from math import sin, cos, pi, exp
import math
import random
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'frontend' / 'public' / 'dream-rooms'
SOURCE = ROOT / 'scene-source'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(exist_ok=True)
random.seed(29)


def material(name, color, metallic=.15, rough=.28, glow=0, glass=False):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Metallic'].default_value = metallic
    bs.inputs['Roughness'].default_value = rough
    bs.inputs['Coat Weight'].default_value = .65
    bs.inputs['Coat Roughness'].default_value = .12
    if glass:
        bs.inputs['Transmission Weight'].default_value = .45
        bs.inputs['IOR'].default_value = 1.38
    if glow:
        bs.inputs['Emission Color'].default_value = (*color, 1)
        bs.inputs['Emission Strength'].default_value = glow
    if name.startswith('Opal'):
        facing = m.node_tree.nodes.new('ShaderNodeLayerWeight')
        ramp = m.node_tree.nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements.remove(ramp.color_ramp.elements[1])
        for idx, (position, rgba) in enumerate([(0,(.37,.50,.88,1)),(.32,(.90,.53,.78,1)),(.66,(.58,.84,.95,1)),(1,(1,.87,.83,1))]):
            el = ramp.color_ramp.elements[0] if idx == 0 else ramp.color_ramp.elements.new(position)
            el.position, el.color = position, rgba
        m.node_tree.links.new(facing.outputs['Facing'], ramp.inputs[0])
        m.node_tree.links.new(ramp.outputs['Color'], bs.inputs['Base Color'])
    return m


def mesh(name, verts, faces, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    ob = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(ob)
    if mat:
        data.materials.append(mat)
    for polygon in data.polygons:
        polygon.use_smooth = True
    return ob


def sphere(name, position, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=24, location=position)
    ob = bpy.context.object
    ob.name = name
    ob.scale = scale if isinstance(scale, tuple) else (scale,)*3
    ob.data.materials.append(mat)
    for polygon in ob.data.polygons:
        polygon.use_smooth = True
    return ob


def curve(name, points, radius, mat):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions = '3D'
    data.resolution_u = 16
    data.bevel_depth = radius
    data.bevel_resolution = 3
    s = data.splines.new('BEZIER')
    s.bezier_points.add(len(points)-1)
    for pt, co in zip(s.bezier_points, points):
        pt.co = co
        pt.handle_left_type = pt.handle_right_type = 'AUTO'
    ob = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(ob)
    data.materials.append(mat)
    return ob


def petal(name, origin, length, width, turn, tilt, mat):
    verts, faces = [], []
    rows, cols = 24, 12
    for i in range(rows+1):
        u = i / rows
        for j in range(cols+1):
            v = j / cols * 2 - 1
            x = width * sin(pi*u)**.7 * v
            y = u * length
            z = length*(.24*sin(pi*u)-.09*u) + .25*width*v*v*sin(pi*u)
            y, z = y*cos(tilt)-z*sin(tilt), y*sin(tilt)+z*cos(tilt)
            verts.append((origin[0]+x*cos(turn)-y*sin(turn),origin[1]+x*sin(turn)+y*cos(turn),origin[2]+z))
    for i in range(rows):
        for j in range(cols):
            a = i*(cols+1)+j
            faces.append((a,a+1,a+cols+2,a+cols+1))
    ob = mesh(name,verts,faces,mat)
    solid = ob.modifiers.new('Silken edge thickness','SOLIDIFY')
    solid.thickness = .012
    return ob


def blossom(position, size, materials, name='Luminous blossom'):
    for layer in range(2):
        count = 9 if layer == 0 else 6
        for k in range(count):
            angle = k/count*2*pi + layer*.4
            petal(f'{name} petal',position,size*(1-layer*.3),size*.30,angle,.18+layer*.45,materials[layer])
    sphere(f'{name} heart',(position[0],position[1],position[2]+.08),size*.14,materials[2])


def ribbon(name, center, size, mat, phase=0):
    verts, faces = [], []
    for i in range(201):
        a = i/200*2*pi
        base = Vector((cos(a)*size, sin(a)*size*.55, sin(a*2+phase)*size*.4))
        side = Vector((cos(a)*.24, sin(a)*.24, .34*cos(a+phase)))
        for sign in [-1,1]:
            p = Vector(center)+base+side*sign
            verts.append(tuple(p))
    for i in range(200):
        a=i*2
        faces.append((a,a+1,a+3,a+2))
    ob=mesh(name,verts,faces,mat)
    thick=ob.modifiers.new('Folded silk thickness','SOLIDIFY');thick.thickness=.018
    sub=ob.modifiers.new('Soft folds','SUBSURF');sub.levels=1
    return ob


def butterfly(center, size, mats, name='Memory butterfly'):
    root=bpy.data.objects.new(name,None)
    bpy.context.collection.objects.link(root)
    root.location=center
    for side in [-1,1]:
        for lower in [False,True]:
            verts=[(0,0,0)]
            outline=[]
            for i in range(81):
                a=i/80*2*pi
                r=1+.09*cos(a*5)
                x=side*(.55+cos(a)*.58)*size*r*(.8 if lower else 1)
                z=(sin(a)*.78+(.65 if not lower else -.43))*size*(.8 if lower else 1)
                y=.15*size*sin(a)+abs(x)*.18
                outline.append((x,y,z));verts.append((x,y,z))
            faces=[(0,i+1,i+2) for i in range(80)]
            wing=mesh('Opalescent wing',verts,faces,mats[0]);wing.parent=root
            edge=curve('Gilt wing margin',outline,.012*size,mats[1]);edge.parent=root
            for index in [9,21,35,49,63,75]:
                end=Vector(outline[index])
                vein=curve('Wing vein',[(0,0,0),tuple(end*.43+Vector((0,-.06,0))),tuple(end)],.009*size,mats[1]);vein.parent=root
            for j in range(8):
                pos=outline[8+j*8]
                bead=sphere('Wing pearl',pos,.024*size,mats[2]);bead.parent=root
    body=sphere('Butterfly body',(0,-.05,0),(.10*size,.10*size,.48*size),mats[1]);body.parent=root
    head=sphere('Butterfly head',(0,-.05,.5*size),.13*size,mats[2]);head.parent=root
    for side in [-1,1]:
        antenna=curve('Fine antenna',[(0,0,.55*size),(side*.16*size,0,.83*size),(side*.31*size,0,.97*size)],.009*size,mats[1]);antenna.parent=root
    root.rotation_euler=(.12,-.14,-.13)
    return root


def page(center,size,angle,mat,name='Unwritten dream page'):
    verts,faces=[],[]
    for i in range(21):
        for j in range(15):
            x=(i/20-.5)*size*1.3
            y=(j/14-.5)*size
            z=.16*size*sin(i/20*pi)+.045*size*sin(j/14*pi*2)
            verts.append((x,y,z))
    for i in range(20):
        for j in range(14):
            a=i*15+j;faces.append((a,a+1,a+16,a+15))
    ob=mesh(name,verts,faces,mat);ob.location=center;ob.rotation_euler=angle
    solid=ob.modifiers.new('Paper edge','SOLIDIFY');solid.thickness=.012
    return ob


def area(name,loc,energy,color,size,target=(1,0,2)):
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.color=color;data.shape='DISK';data.size=size
    ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=loc
    ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()


def setup(key, dark=False):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene=bpy.context.scene
    scene.name='Mengsu '+key
    scene.render.engine='BLENDER_EEVEE'
    scene.eevee.taa_render_samples=48
    scene.render.resolution_x=2560;scene.render.resolution_y=1440;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG'
    scene.render.image_settings.color_mode='RGBA'
    scene.view_settings.view_transform='AgX'
    world=bpy.data.worlds.new('Pearl lavender atmosphere');world.use_nodes=True
    world.node_tree.nodes['Background'].inputs['Color'].default_value=(.26,.22,.42,1) if dark else (.68,.57,.76,1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=.4 if dark else .6
    scene.world=world
    bpy.ops.object.camera_add(location=(0,-16,7.5))
    camera=bpy.context.object;camera.name='Dream room camera'
    camera.rotation_euler=(Vector((0,0,2.5))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='PERSP';camera.data.lens=43
    camera.data.dof.use_dof=True;camera.data.dof.focus_distance=17.4;camera.data.dof.aperture_fstop=5.6
    scene.camera=camera
    mats={
        'opal':material('Opal silk',(.9,.7,.87),.38,.22),
        'pink':material('Rose petal porcelain',(.94,.56,.73),.12,.32),
        'pearl':material('Ivory pearl',(.96,.85,.89),.35,.2),
        'ice':material('Ice periwinkle',(.48,.66,.94),.3,.23),
        'gold':material('Rosy platinum',(.65,.36,.52),.74,.2),
        'light':material('Starlight',(.94,.79,1),.1,.2,2.2),
        'glass':material('Opal crystal',(.73,.82,1),.24,.15,glass=True),
        'bark':material('Lilac living wood',(.28,.16,.37),.1,.38),
    }
    ground=material('Dust velvet ground',(.34,.27,.47) if dark else (.68,.57,.73),.18,.43)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.8));bpy.context.object.name='Seamless dream floor';bpy.context.object.data.materials.append(ground)
    area('Pearl key',(-5,-6,11),2200,(1,.77,.87),8)
    area('Ice rim',(7,1,8),2700,(.52,.72,1),7)
    area('Rose fill',(-6,5,6),1800,(1,.48,.7),9)
    area('Soft front',(1,-9,5),700,(.94,.9,1),6)
    return mats


def atmosphere(mats, seed, count=35):
    rng=random.Random(seed)
    for i in range(count):
        p=(rng.uniform(-7,8),rng.uniform(-1,7),rng.uniform(.5,7))
        scale=rng.uniform(.025,.065)
        sphere('Airborne memory light',p,scale,mats['light'])
    for i in range(10):
        p=(rng.uniform(-8,8),rng.uniform(0,8),rng.uniform(.5,7))
        sphere('Opal floating droplet',p,rng.uniform(.12,.34),mats['glass'])


def create_room(key):
    mats=setup(key,key in ['listening','rest'])
    flowers=[mats['pink'],mats['opal'],mats['light']]
    if key=='entrance':
        # A woven sleeping seed, suspended by a single impossibly soft thread.
        sphere('Opaline dream seed',(2.6,.3,3.4),(1.48,1.13,2.05),mats['opal'])
        for j in range(14):
            phase=j/14*2*pi
            pts=[]
            for i in range(61):
                a=-pi/2+.05+i/60*(pi-.1)
                pts.append((2.6+1.5*cos(a)*cos(phase),.3+1.17*cos(a)*sin(phase),3.4+2.1*sin(a)))
            curve('Silken cocoon rib',pts,.018,mats['pearl'])
        curve('Dream suspension',[(2.6,.3,5.4),(2.75,.4,6.6),(2.5,.5,9)],.017,mats['gold'])
        for i in range(3):
            ob=ribbon('Unfolding memory silk',(2.6,.3,2.8+i*.2),2.4+i*.4,mats['pink'] if i%2 else mats['opal'],i*.7)
            ob.rotation_euler=(.25+i*.12,0,.2)
        for p,s in [((5,1,.2),.9),((.5,1,-.15),.55),((6,3,.4),.7)]:blossom(p,s,flowers)
    elif key=='garden':
        for side in [-1,1]:
            x=side*6
            curve('Inverted dream trunk',[(x,3,9),(x*.84,2,6.8),(x*.95,2,4.6)],.27,mats['bark'])
            for j in range(7):
                end=(side*(3.5+j*.52),1.8+j*.25,3.2+sin(j*1.8)*1.1)
                curve('Hanging blossom branch',[(x*.85,2,6.6),(end[0],2,5.1),end],.065,mats['bark'])
                blossom(end,.45+(j%3)*.12,flowers,'Upside-down blossom')
        butterfly((3.5,-.2,3.6),1.3,[mats['opal'],mats['gold'],mats['light']])
        for i in range(22):
            a=i*2.4;r=2.2+i*.10
            p=(2.4+cos(a)*r,1.5+sin(a)*r,-.5)
            blossom(p,.26+(i%3)*.11,flowers,'Dream floor blossom')
        curve('A thread leading home',[(1,-4,-.3),(2,-1,-.2),(3,2,.2),(5,5,1)],.018,mats['light'])
    elif key=='pages':
        for i in range(14):
            a=i*.48
            p=(3.0+cos(a)*1.8,1+sin(a)*1.2,1+i*.31)
            page(p,1.15,(.2+sin(a)*.4,.2+cos(a)*.6,a*.42),mats['pearl'] if i%3 else mats['opal'])
        for i in range(3):
            ob=ribbon('Scriptless ribbon',(3,.8,2.5),2.25+i*.25,mats['gold'] if i==1 else mats['pink'],i)
            ob.rotation_euler=(.6,0,i*.4)
        butterfly((5,-1,5.2),.44,[mats['opal'],mats['gold'],mats['light']])
        blossom((5.6,-1,-.5),1.4,flowers)
    elif key in ['archive','branches']:
        for j in range(5):
            x=2.5+sin(j*2.2)*2.4
            z=1+j*.9
            curve('Memory growing branch',[(4,3,-.5),(3,2,1.6),(x,1,z)],.045+j*.01,mats['gold'])
            butterfly((x,.7,z),.36+j*.11,[mats['opal'],mats['gold'],mats['light']])
        for i in range(30):
            a=i*.43
            sphere('Thread pearl',(2.9+cos(a)*2.4,.5+sin(a)*1.1,.3+i*.18),.055,mats['light'])
        for i in range(8):blossom((5+sin(i)*1.3,1+cos(i),-.4),.5,flowers)
        if key=='branches':
            bpy.context.scene.camera.location=(1,-14,9)
            bpy.context.scene.camera.rotation_euler=(Vector((1,1,2.4))-bpy.context.scene.camera.location).to_track_quat('-Z','Y').to_euler()
    elif key=='listening':
        blossom((3.5,.8,1),2.35,flowers,'Listening blossom')
        for j in range(6):
            pts=[(3+cos(i/80*2*pi)*(1.3+j*.22),.5+sin(i/80*2*pi)*(1.1+j*.15),3.1+sin(i/80*4*pi)*.4+j*.28) for i in range(81)]
            curve('Unspoken thought thread',pts,.012,mats['light'] if j%2 else mats['gold'])
        sphere('A quiet thought',(3,.7,4),(1.1,.86,1.1),mats['opal'])
    elif key=='rest':
        sphere('Sleeping memory seed',(3.2,.6,2.1),(.75,.62,1.15),mats['pearl'])
        for i in range(8):
            petal('Sheltering silk petal',(3.2,.6,1.5),2.65,.85,i/8*2*pi,1.05,mats['opal'] if i%2 else mats['pink'])
        for i in range(12):
            a=i/12*2*pi
            p=(3.2+cos(a)*3,1+sin(a)*1.7,4.6+sin(a*2)*.5)
            petal('Hanging dusk petal',p,.95,.3,a,.2,mats['opal'])
            curve('A fine suspended thread',[(p[0],p[1],8),p],.008,mats['gold'])
        for i in range(8):blossom((2+sin(i*2.4)*3,2+cos(i*2.4)*2,-.5),.4,flowers)
    else:
        sphere('Private keepsake',(3,.5,2.4),(1.65,1.1,1.8),mats['glass'])
        for i in range(7):
            p=(3+sin(i)*.9,.5+cos(i)*.8,1.2+i*.28)
            blossom(p,.65,flowers)
        for i in range(3):
            ob=ribbon('Keepsake silk',(3,.5,2.2),2+i*.28,mats['pearl'] if i%2 else mats['opal'],i*.7)
            ob.rotation_euler=(.6,.25,0)
    atmosphere(mats,len(key)*31)
    # Foreground forms are separately positioned, casting soft, readable depth.
    petal('Near lens petal',(-5.8,-5.8,.3),3.1,1.2,-.7,.48,mats['pink'])
    petal('Near lens silk',(6.3,-5.5,.2),3.1,1.4,.8,.62,mats['opal'])
    return mats


for key in ['entrance','garden','pages','archive','branches','listening','rest','keepsake']:
    create_room(key)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/f'dream-room-{key}.blend'))
    bpy.context.scene.render.filepath=str(OUT/f'{key}.png')
    bpy.ops.render.render(write_still=True)
    print('ROOM_RENDERED',key,flush=True)

# One actual transparent 3D foreground, reused as the nearer parallax plane.
mats=setup('foreground')
for ob in list(bpy.context.scene.objects):
    if ob.type=='MESH':bpy.data.objects.remove(ob,do_unlink=True)
bpy.context.scene.render.film_transparent=True
petal('Front rose petal',(-6.5,-3.5,.4),3.2,1.4,-.8,.45,mats['opal'])
petal('Front ivory petal',(7,-4,.2),3,1.6,.7,.65,mats['pink'])
sphere('Front opal bubble',(6,-3.2,5.4),.4,mats['glass'])
sphere('Front pearl bubble',(-6.8,-3,3.7),.22,mats['opal'])
bpy.context.scene.render.filepath=str(OUT/'foreground.png')
bpy.ops.render.render(write_still=True)
print('ROOM_RENDERED foreground',flush=True)
