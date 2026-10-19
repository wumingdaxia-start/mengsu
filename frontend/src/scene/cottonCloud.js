import * as THREE from 'three'

// Deterministic fine fibres retain their detail when the camera approaches.
export function createCottonTexture(resources) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 512
  const ctx = canvas.getContext('2d')
  let seed = 8137
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  const lobes = Array.from({length: 16}, (_, i) => {
    const a = i * 2.399
    return {x: 256 + Math.cos(a) * (i % 3) * 49, y: 256 + Math.sin(a) * (i % 3) * 36, r: 75 + random() * 36}
  }).sort((a,b) => b.y-a.y)
  for (const lobe of lobes) {
    const shade=ctx.createRadialGradient(lobe.x-22,lobe.y-28,3,lobe.x,lobe.y,lobe.r)
    shade.addColorStop(0,'rgba(255,255,250,.98)')
    shade.addColorStop(.48,'rgba(250,241,234,.95)')
    shade.addColorStop(.79,'rgba(203,180,198,.78)')
    shade.addColorStop(1,'rgba(203,180,198,0)')
    ctx.fillStyle=shade;ctx.fillRect(lobe.x-lobe.r,lobe.y-lobe.r,lobe.r*2,lobe.r*2)
    for(let n=0;n<2400;n++){
      const a=random()*Math.PI*2,r=Math.sqrt(random())*lobe.r*.98
      const x=lobe.x+Math.cos(a)*r,y=lobe.y+Math.sin(a)*r
      const edge=r/lobe.r,light=Math.max(0,1-(y-lobe.y+lobe.r)/(2*lobe.r))
      ctx.strokeStyle=`rgba(255,253,246,${(.08+light*.24)*(1-edge*.5)})`
      ctx.lineWidth=.4+random()*.6;ctx.beginPath();ctx.moveTo(x,y)
      ctx.quadraticCurveTo(x-1,y-2,x+Math.cos(a)*(1+random()*4),y+Math.sin(a)*(1+random()*4));ctx.stroke()
    }
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace
  resources.add(texture);return texture
}

export function createCottonCloud(texture, resources, phase=0) {
  const group=new THREE.Group()
  const palette=[0xffe8b8,0xf5bfd0,0xb9d5f2,0xf9d9c7,0xe1c7e9]
  for(let j=0;j<7;j++){
    const mat=new THREE.SpriteMaterial({map:texture,color:palette[(j+phase)%palette.length],transparent:true,opacity:.94,depthWrite:false})
    resources.add(mat)
    const puff=new THREE.Sprite(mat)
    puff.position.set((j%3-1)*1.04,Math.floor(j/3)*.52-.5,Math.sin(j*2.4)*.5)
    puff.scale.set(3.5+(j%2)*.35,3.05,1);group.add(puff)
  }
  return group
}
