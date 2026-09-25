import * as THREE from 'three';

const COLORS = [0x9ce9ff, 0xbbb0ff, 0xffb3d3];
const COUNT = 68;

// Spring-connected atoms and a procedural gas volume share the same input.
// DOM controls remain available when WebGL isn't available.
export function createMatterField(host, { reduced, kind = 'chamber' }) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch { host.classList.add('matter-fallback'); return { setProject() {}, setLayer() {}, setMode() {} }; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.4));
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(39, 1, .1, 100);
  camera.position.z = 16;
  scene.add(new THREE.AmbientLight(0x899bde, 1.7));
  const light = new THREE.DirectionalLight(0xdaffff, 4); light.position.set(-4, 5, 7); scene.add(light);
  const pink = new THREE.PointLight(0xeb91ff, 50, 25); pink.position.set(5, -2, 4); scene.add(pink);
  const group = new THREE.Group(); scene.add(group);
  const geo = new THREE.SphereGeometry(1, 20, 14);
  const atoms = COLORS.map(color => new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color, metalness: .42, roughness: .22, emissive: color, emissiveIntensity: .1 }), COUNT));
  atoms.forEach(mesh => { mesh.frustumCulled=false;mesh.count = 0; group.add(mesh); });
  const bonds = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), new THREE.MeshStandardMaterial({ color: 0x809aca, metalness: .35, roughness: .4, transparent: true, opacity: .48 }), COUNT * 2);
  bonds.frustumCulled=false;group.add(bonds);
  const haloCanvas = document.createElement('canvas'); haloCanvas.width = haloCanvas.height = 64;
  const ctx = haloCanvas.getContext('2d'), glow = ctx.createRadialGradient(32,32,0,32,32,32);
  glow.addColorStop(0,'rgba(144,175,255,.18)');glow.addColorStop(.25,'rgba(132,138,255,.08)');glow.addColorStop(1,'rgba(80,110,230,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,64,64);
  const haloTexture = new THREE.CanvasTexture(haloCanvas);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); halo.scale.set(13,13,1);group.add(halo);
  const positions = [], velocities = [], seeds = [];
  for(let i=0;i<COUNT;i++){
    seeds.push(new THREE.Vector3(Math.sin(i*132.7),Math.cos(i*47.3),Math.sin(i*17.9)));
    positions.push(seeds[i].clone().multiplyScalar(5));velocities.push(new THREE.Vector3());
  }
  const uniforms = {time:{value:0},energy:{value:0},pointer:{value:new THREE.Vector2(.5,.5)},hue:{value:new THREE.Color('#7775cf')}};
  const gas = new THREE.Mesh(new THREE.PlaneGeometry(28, 20),new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`precision highp float;varying vec2 vUv;uniform float time,energy;uniform vec2 pointer;uniform vec3 hue;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      float f(vec2 p){return n(p)*.5+n(p*2.03+7.)*.25+n(p*4.1)*.125;}
      void main(){vec2 p=vUv*4.;float t=time*.07;float q=f(p+vec2(t,-t));float cloud=f(p+q*3.+vec2(-t,t*.7));float distance=length((vUv-pointer)*vec2(1.3,1.));float wake=exp(-distance*5.)*energy;float density=smoothstep(.2,.8,cloud+q*.35+wake*.24);float edge=1.-smoothstep(.15,.75,length(vUv-.5));vec3 col=mix(hue,vec3(.4,.85,1.),q+wake*.5);gl_FragColor=vec4(col*density,density*edge*(.42+energy*.25));}`
  }));gas.position.z=-5;scene.add(gas);
  const dustGeo=new THREE.BufferGeometry(), dustPoints=[];
  for(let i=0;i<520;i++)dustPoints.push(Math.sin(i*13.7)*13,Math.cos(i*47.1)*9,Math.sin(i*7.3)*6-3);
  dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(dustPoints,3));
  const dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xc0d8ff,size:.025,transparent:true,opacity:.55}));scene.add(dust);
  let mode='bond',project=0,layer=0,energy=0,frame=0,visible=false,time=0,last=0,drag=false,dragX=0,dragY=0,rotation=0,tilt=0,scrollProgress=.5;
  let width=1,height=1;
  const pointer=new THREE.Vector2(5,5), dummy=new THREE.Object3D(),axis=new THREE.Vector3(0,1,0),direction=new THREE.Vector3(),target=new THREE.Vector3();
  function atomTarget(i,t){
    const a=i*2.39996,r=Math.sqrt((i+.5)/COUNT)*3.25,z=1-2*(i+.5)/COUNT;
    if(kind==='anatomy'){
      const ring=i%3,angle=Math.floor(i/3)/23*Math.PI*2;
      return target.set(Math.cos(angle)*(1.65+ring*.26),(1-ring)*(1.2+scrollProgress*1.7),Math.sin(angle)*(1.65+ring*.26));
    }
    if(mode==='gas')return target.copy(seeds[i]).multiplyScalar(3.5).addScaledVector(seeds[(i+9)%COUNT],Math.sin(t*.3+i)*.4);
    if(mode==='orbit')return target.set(Math.cos(a+t*.08)*(2+(i%3)*.7),Math.sin(a+t*.08)*(.7+(i%3)*.4),Math.sin(i*3.7)*1.4);
    const variant=kind==='world'?project%5:0;
    if(variant===1)return target.set((i%9-4)*.64,(Math.floor(i/9)-3)*.5,Math.sin(i*.7)*1.1);
    if(variant===2)return target.set(Math.cos(a)*(2.1+(i%3)*.25),Math.sin(a)*(2.1+(i%3)*.25),Math.sin(i*4.1)*.7);
    if(variant===3)return target.set((i%4-1.5)*1.1,((Math.floor(i/4)%4)-1.5)*1.1,(Math.floor(i/16)-1.5)*1.1);
    if(variant===4)return target.set(Math.cos(a)*r,Math.sin(a)*r,Math.sin(r*2.+i*.1)*.7);
    return target.set(Math.cos(a)*Math.sqrt(1-z*z)*2.7,z*2.7,Math.sin(a)*Math.sqrt(1-z*z)*2.7);
  }
  function draw(now){
    frame=0;const dt=Math.min((now-last)/1000||.016,.035);last=now;
    if(!reduced.matches)time+=dt;
    energy=reduced.matches?0:energy*Math.exp(-dt*1.1);
    uniforms.time.value=time;uniforms.energy.value=energy;
    const rect=(kind==='anatomy'?surface:host).getBoundingClientRect();scrollProgress=THREE.MathUtils.clamp((innerHeight-rect.top)/(innerHeight+rect.height),0,1);
    group.rotation.y=reduced.matches?.25:time*.075+rotation+(scrollProgress-.5)*1.3;
    group.rotation.x=reduced.matches?.15:tilt+.12+Math.sin(time*.17)*.08;
    group.position.x=kind==='world'&&width>800?1.35:0;
    group.scale.setScalar(kind==='world'&&width<800?.82:1);
    const counts=[0,0,0];
    for(let i=0;i<COUNT;i++){
      const goal=atomTarget(i,time).clone();
      if(!reduced.matches){goal.addScaledVector(seeds[i],energy*1.65);const dx=goal.x-pointer.x,dy=goal.y-pointer.y,wake=Math.exp(-(dx*dx+dy*dy)*.4);goal.x+=dx*wake*.3;goal.y+=dy*wake*.3;velocities[i].addScaledVector(goal.sub(positions[i]),dt*22).multiplyScalar(Math.exp(-dt*7));positions[i].addScaledVector(velocities[i],dt*8);}
      else positions[i].copy(goal);
      dummy.position.copy(positions[i]);dummy.quaternion.identity();let size=(i%7===0?.25:.11+(i%3)*.025);
      if(kind==='anatomy')size*=i%3===layer?1.4:.8;
      dummy.scale.setScalar(size);dummy.updateMatrix();atoms[i%3].setMatrixAt(counts[i%3]++,dummy.matrix);
    }
    atoms.forEach((mesh,i)=>{mesh.count=counts[i];mesh.instanceMatrix.needsUpdate=true;});
    let bondCount=0;
    if(mode!=='gas')for(let i=0;i<COUNT;i++)for(let j=i+1;j<COUNT&&bondCount<COUNT*2;j++){
      const dist=positions[i].distanceTo(positions[j]);if(dist<.35||dist>(kind==='anatomy'?.92:1.25))continue;
      dummy.position.copy(positions[i]).lerp(positions[j],.5);direction.subVectors(positions[j],positions[i]).normalize();dummy.quaternion.setFromUnitVectors(axis,direction);dummy.scale.set(.019,dist,.019);dummy.updateMatrix();bonds.setMatrixAt(bondCount++,dummy.matrix);
    }
    bonds.count=bondCount;bonds.instanceMatrix.needsUpdate=true;
    dust.rotation.z=reduced.matches?0:time*.009;
    renderer.render(scene,camera);
    host.dataset.energy=energy>.1?'active':'rest';
    if(visible&&!document.hidden&&!reduced.matches)frame=requestAnimationFrame(draw);
  }
  function resume(){if(frame)cancelAnimationFrame(frame);frame=0;last=performance.now();if(visible&&!document.hidden)draw(last);}
  function resize(){width=host.clientWidth;height=host.clientHeight;renderer.setSize(width,height);camera.aspect=width/height;camera.position.z=width<600?19:16;camera.updateProjectionMatrix();resume();}
  const surface=host.closest('section');
  let moved=false,startX=0,startY=0;
  surface.addEventListener('pointerdown',e=>{
    if(e.target.closest('a,input,select,button:not(.world-art)'))return;
    drag=true;moved=false;startX=dragX=e.clientX;startY=dragY=e.clientY;energy=Math.min(energy+1,2);host.dataset.touched='true';if(reduced.matches)resume();
  },{passive:true});
  surface.addEventListener('pointermove',e=>{
    const rect=host.getBoundingClientRect();const nx=(e.clientX-rect.left)/width,ny=(e.clientY-rect.top)/height;
    uniforms.pointer.value.set(nx,1-ny);pointer.set((nx-.5)*10,(.5-ny)*8);
    if(drag){const dx=e.clientX-dragX,dy=e.clientY-dragY;rotation+=dx*.008;tilt=THREE.MathUtils.clamp(tilt+dy*.004,-.8,.8);energy=Math.min(energy+.025,1.8);dragX=e.clientX;dragY=e.clientY;moved=Math.hypot(e.clientX-startX,e.clientY-startY)>8;}
  },{passive:true});
  surface.addEventListener('click',e=>{if(moved&&e.target.closest('.world-art')){e.preventDefault();e.stopPropagation();}moved=false;},true);
  surface.addEventListener('pointerleave',()=>{pointer.set(5,5);drag=false;});
  addEventListener('pointerup',()=>drag=false);addEventListener('pointercancel',()=>{drag=false;moved=false;});
  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;resume();}).observe(host);
  document.addEventListener('visibilitychange',resume);reduced.addEventListener('change',resume);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();visible=false;if(frame)cancelAnimationFrame(frame);host.classList.add('matter-fallback');});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{host.classList.remove('matter-fallback');visible=true;resume();});
  return {
    setMode(value){mode=value;energy=1.4;host.dataset.mode=value;resume();},
    setProject(index,color){project=index;energy=1.2;if(color)uniforms.hue.value.set(color);resume();},
    setLayer(value){layer=value;resume();}
  };
}
