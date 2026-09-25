import * as THREE from 'three';

// A procedural scene: no photographic background or remote textures.
export function createGalaxy(host, reduced) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' }); }
  catch { host.classList.add('galaxy-fallback'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, .1, 100);
  camera.position.z = 12;
  const uniforms = { time: {value: 0}, pointer: {value: new THREE.Vector2()}, travel: {value: 0} };
  const galaxy = new THREE.Mesh(new THREE.PlaneGeometry(30, 22), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms,
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `precision highp float;
      varying vec2 vUv; uniform float time; uniform vec2 pointer; uniform float travel;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+7.;a*=.5;}return v;}
      void main(){
        vec2 p=(vUv-vec2(.59,.51))*vec2(1.45,1.);
        p+=pointer*.018; p*=1.-travel*.26;
        float r=length(p),a=atan(p.y,p.x);
        float swirl=sin(a*3.+r*26.-time*.08);
        float n=fbm(p*7.+vec2(time*.012,0.));
        float arms=pow(max(0.,swirl*.5+.5),3.)*exp(-r*5.)*n;
        float cloud=fbm(p*9.+n*3.)*exp(-r*3.);
        vec3 col=mix(vec3(.15,.20,.65),vec3(.60,.22,.50),n)*cloud*.8;
        col+=mix(vec3(.22,.48,1.),vec3(.83,.48,.83),n)*arms*1.8;
        col+=vec3(.68,.80,1.)*.038/(r+.04)*exp(-r*5.);
        gl_FragColor=vec4(col,1.);
      }`
  }));
  galaxy.position.z = -5; scene.add(galaxy);
  let seed = 73;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const positions = new Float32Array(2100 * 3);
  for(let i=0;i<positions.length;i+=3){positions[i]=(random()-.5)*36;positions[i+1]=(random()-.5)*24;positions[i+2]=(random()-.5)*14;}
  const starsGeometry = new THREE.BufferGeometry(); starsGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const stars = new THREE.Points(starsGeometry,new THREE.PointsMaterial({color:0xc0d9ff,size:.021,transparent:true,opacity:.8})); scene.add(stars);

  // Dust begins dispersed and settles into the portfolio mark. Pointer repulsion
  // is evaluated in the vertex shader, so it doesn't require per-frame buffers.
  const stamp=document.createElement('canvas');stamp.width=600;stamp.height=240;
  const ink=stamp.getContext('2d');ink.font='900 210px Arial';ink.textAlign='center';ink.fillText('GAS',300,195);
  const pixels=ink.getImageData(0,0,600,240).data, letters=[],scatter=[];
  for(let y=0;y<240;y+=3)for(let x=0;x<600;x+=3)if(pixels[(y*600+x)*4+3]>100){letters.push((x-300)/90,(120-y)/90,0);scatter.push((random()-.5)*25,(random()-.5)*15,(random()-.5)*8);}
  const dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute('position',new THREE.Float32BufferAttribute(letters,3));dustGeometry.setAttribute('scatter',new THREE.Float32BufferAttribute(scatter,3));
  const dustPointer=new THREE.Vector2(50,50);
  const dustUniforms={...uniforms,pointer:{value:dustPointer},formation:{value:reduced.matches?1:0},pixelRatio:{value:renderer.getPixelRatio()}};
  const dust=new THREE.Points(dustGeometry,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:dustUniforms,
    vertexShader:`attribute vec3 scatter;uniform float time,formation,travel,pixelRatio;uniform vec2 pointer;varying float alpha;
      void main(){vec3 p=mix(scatter,position,formation);p+=scatter*travel*.8;
      vec2 d=p.xy-pointer;float wake=exp(-dot(d,d)*.8);p.xy+=normalize(d+vec2(.001))*wake*.55;
      p.z+=sin(time*.5+p.x*2.)*.10;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=(1.3+sin(position.x*9.)*.5)*pixelRatio;alpha=(.4+sin(position.y*25.)*.25)*(1.-travel*.65);}`,
    fragmentShader:'varying float alpha;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(.59,.75,1.,alpha*(1.-d));}'
  }));dust.position.set(3.2,1,-1);scene.add(dust);
  // During the second opening frame, scattered lettering resolves into an atom.
  const nucleus=new THREE.Group();nucleus.position.set(-2.7,.1,-2);scene.add(nucleus);
  const orbitalMaterial=new THREE.MeshBasicMaterial({color:0xa9bfff,transparent:true,opacity:0});
  const beadMaterial=new THREE.MeshBasicMaterial({color:0xc7dfff,transparent:true,opacity:0});
  for(let i=0;i<3;i++){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(2.4,.013,5,90),orbitalMaterial);ring.rotation.set(i*Math.PI/3,.65+i*.7,.4);nucleus.add(ring);
    for(let j=0;j<4;j++){
      const bead=new THREE.Mesh(new THREE.SphereGeometry(.06+j*.012,12,8),beadMaterial);
      bead.position.set(Math.cos(j*Math.PI/2)*2.4,Math.sin(j*Math.PI/2)*2.4,0).applyEuler(ring.rotation);nucleus.add(bead);
    }
  }
  let width=1,height=1,frame=0,visible=true,start=performance.now(),progress=0;
  const target=new THREE.Vector2();
  function resize(){width=host.clientWidth;height=host.clientHeight;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();dust.position.x=width<800?0:3.2;dust.position.y=width<800?2.5:1;dust.scale.setScalar(width<800?.65:1);resume();}
  function render(now){
    frame=0;
    uniforms.time.value=reduced.matches?0:(now-start)/1000;
    uniforms.pointer.value.lerp(reduced.matches?new THREE.Vector2():target,.07);
    progress=reduced.matches?0:Math.min(1,Math.max(0,scrollY/(innerHeight*1.7)));
    uniforms.travel.value=progress;
    dustUniforms.formation.value=reduced.matches?1:Math.min(1,(now-start)/2400);
    camera.position.z=12-progress*3;stars.rotation.z=reduced.matches?0:uniforms.time.value*.003;
    camera.position.x=uniforms.pointer.value.x*.12;
    const atomReveal=Math.sin(THREE.MathUtils.clamp((progress-.18)/.8,0,1)*Math.PI);
    nucleus.visible=atomReveal>.01;nucleus.rotation.y=progress*2.4;nucleus.rotation.z=progress*.8;
    nucleus.scale.setScalar(width<800?.65:1+progress*.4);
    nucleus.position.x=width<800?0:-2.7;
    orbitalMaterial.opacity=atomReveal*.45;beadMaterial.opacity=atomReveal*.8;
    renderer.render(scene,camera);
    if(visible&&!document.hidden&&!reduced.matches)frame=requestAnimationFrame(render);
  }
  function resume(){if(frame)cancelAnimationFrame(frame);frame=0;if(visible&&!document.hidden)render(performance.now());}
  host.parentElement.addEventListener('pointermove',e=>{
    if(reduced.matches)return;
    const rect=host.getBoundingClientRect();
    target.set((e.clientX-rect.left)/width*2-1,1-(e.clientY-rect.top)/height*2);
    const halfHeight=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*(camera.position.z-dust.position.z);
    dustPointer.set((target.x*halfHeight*camera.aspect+camera.position.x-dust.position.x)/dust.scale.x,(target.y*halfHeight-dust.position.y)/dust.scale.y);
  },{passive:true});
  host.parentElement.addEventListener('pointerleave',()=>{target.set(0,0);dustPointer.set(50,50);});
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;resume();}).observe(host.parentElement);
  document.addEventListener('visibilitychange',resume);reduced.addEventListener('change',resume);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();visible=false;if(frame)cancelAnimationFrame(frame);host.classList.add('galaxy-fallback');});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{visible=true;host.classList.remove('galaxy-fallback');resume();});
}
