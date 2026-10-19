import * as THREE from 'three'

// Two independently rendered worlds merge through a soft, turbulent depth reveal.
// The travel axis stays centred: there is no horizontal page translation.
export function createCloudTransition(renderer, resources) {
  const targets = [new THREE.WebGLRenderTarget(1, 1, {type:THREE.HalfFloatType}), new THREE.WebGLRenderTarget(1, 1, {type:THREE.HalfFloatType})]
  targets.forEach(target => resources.add(target))
  const uniforms = {
    outgoing: {value: targets[0].texture}, incoming: {value: targets[1].texture},
    direction: {value: 1}, progress: {value: 0}, time: {value: 0}, aspect: {value: 1},
    origin: {value: new THREE.Vector2(.5, .5)},
  }
  const material = new THREE.ShaderMaterial({
    uniforms, depthTest: false, depthWrite: false, toneMapped: true,
    vertexShader: `varying vec2 vUv;
      void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader: `
      uniform sampler2D outgoing, incoming;
      uniform float progress, time, aspect, direction;
      uniform vec2 origin;
      varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
      float mist(vec2 p){return noise(p)*.58+noise(p*2.07)*.28+noise(p*4.19)*.14;}
      void main(){
        float p=progress;
        vec2 axis=(aspect<.85?vec2(0.,-1.):normalize(vec2(1.,.12)))*direction;
        float sweep=dot(vUv-.5,axis);
        float reveal=smoothstep(-.22,.22,p*1.5-.75+sweep*.7);
        float pulse=sin(reveal*3.14159265);
        float n=mist(vUv*4.+vec2(time*.035,0.))-.5;
        vec2 waves=vec2(sin(vUv.y*10.+time*.3),cos(vUv.x*8.-time*.2));
        vec2 bending=waves*.035*pulse+axis*n*.055*sin(p*3.14159265);
        vec2 oldUv=.5+(vUv-.5)/(1.+p*.7)+axis*reveal*.20+bending;
        vec2 newUv=.5+(vUv-.5)/(1.12-.12*p)-axis*(1.-reveal)*.22-bending*.65;
        oldUv=1.-abs(mod(oldUv,2.)-1.);
        newUv=1.-abs(mod(newUv,2.)-1.);
        vec3 before=texture2D(outgoing,oldUv).rgb;
        vec3 after=texture2D(incoming,newUv).rgb;
        vec3 color=mix(before,after,reveal);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
  const geometry = new THREE.PlaneGeometry(2, 2)
  resources.add(material); resources.add(geometry)
  const screen = new THREE.Scene(), camera = new THREE.Camera()
  const quad = new THREE.Mesh(geometry, material); quad.frustumCulled = false; screen.add(quad)
  return {
    uniforms,
    resize(width, height) {
      const ratio = Math.min(renderer.getPixelRatio(), 1.5)
      targets.forEach(target => target.setSize(Math.round(width*ratio), Math.round(height*ratio)))
      uniforms.aspect.value=width/height
    },
    capture(index, scene, view) {
      const mapping = renderer.toneMapping
      renderer.toneMapping = THREE.NoToneMapping
      renderer.setRenderTarget(targets[index]); renderer.render(scene, view)
      renderer.toneMapping = mapping
    },
    draw(progress, time) {
      uniforms.progress.value=progress; uniforms.time.value=time
      renderer.setRenderTarget(null); renderer.render(screen,camera)
    },
  }
}
