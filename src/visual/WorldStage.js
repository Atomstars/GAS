import * as THREE from 'three';
import gsap from 'gsap';

// Shared lighting and a distinct subject per world. Geometry is illustrative.
// No live market data or unverified product metrics are rendered here.
export async function createWorldStage(canvas, reduced) {
  const renderer = new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.25:1.5));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x0b0d10,.017);
  const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.1,130);camera.position.set(0,0,12);
  scene.add(new THREE.AmbientLight(0x7586a4,.65));
  const key=new THREE.DirectionalLight(0xf6d5bd,3.5);key.position.set(-5,6,3);scene.add(key);
  const rim=new THREE.PointLight(0x78aee8,45,35);rim.position.set(5,1,-3);scene.add(rim);
  const root=new THREE.Group();root.position.x=2.7;scene.add(root);
  const material=(color,metalness=.4)=>new THREE.MeshStandardMaterial({color,metalness,roughness:.35});
  const wire=(color,opacity=.25)=>new THREE.LineBasicMaterial({color,transparent:true,opacity});
  const worlds=new Map();
  let active,theme='origin',clock=0,frame=0,paused=false,last=0,travel=null;
  const pointer=new THREE.Vector2(),smoothPointer=new THREE.Vector2();
  const earthTexture=new THREE.TextureLoader().load('/work/earth.jpg',()=>renderStill());earthTexture.colorSpace=THREE.SRGBColorSpace;

  function ring(radius,color,tilt=0) {
    const points=Array.from({length:129},(_,i)=>new THREE.Vector3(Math.cos(i/128*Math.PI*2)*radius,Math.sin(i/128*Math.PI*2)*radius,0));
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),wire(color,.4));line.rotation.x=tilt;return line;
  }
  function sphere(radius,mat){return new THREE.Mesh(new THREE.SphereGeometry(radius,48,32),mat);}
  function box(x,y,z,mat){return new THREE.Mesh(new THREE.BoxGeometry(x,y,z),mat);}
  function makeWorld(type) {
    const group=new THREE.Group();group.userData.type=type;
    if(type==='origin'||type==='orbit') {
      const globe=sphere(2.55,type==='orbit'?new THREE.MeshStandardMaterial({map:earthTexture,roughness:.85,metalness:.05}):material(0x302921,.6));globe.rotation.z=.25;group.add(globe);group.userData.globe=globe;
      const atmosphere=sphere(2.61,new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,uniforms:{color:{value:new THREE.Color(type==='orbit'?0x72a6e4:0xe3aa78)}},vertexShader:'varying vec3 vNormal;varying vec3 vPosition;void main(){vNormal=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.0);vPosition=p.xyz;gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 vNormal;varying vec3 vPosition;uniform vec3 color;void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(-vPosition))),3.);gl_FragColor=vec4(color,rim*.65);}'}));group.add(atmosphere);
      for(let i=0;i<3;i++){const orbit=ring(3.1+i*.45,type==='orbit'?0x9fc9e6:0xe4b18c,1.1+i*.16);orbit.rotation.z=.35+i*.32;group.add(orbit);}
      if(type==='orbit'){
        const satellite=new THREE.Group();satellite.add(box(.28,.28,.4,material(0xd8e2e8)));
        for(const side of [-1,1]){const panel=box(.7,.025,.4,material(0x264b74));panel.position.x=side*.6;satellite.add(panel);}
        satellite.position.set(2.6,1.4,1.2);satellite.rotation.z=.4;group.add(satellite);group.userData.satellite=satellite;
      }
    } else if(type==='market') {
      const grid=new THREE.GridHelper(9,18,0x4c6a55,0x24352c);grid.position.y=-1.8;group.add(grid);
      const heights=[.8,1.3,.9,1.6,2.3,1.8,2.8,2.2,3.4,2.9,3.8,3.1];
      heights.forEach((h,i)=>{const up=i%3!==2;const bar=box(.25,.55+(i%3)*.23,.28,material(up?0x95cfa9:0x926b62));bar.position.set((i-5.5)*.49,h-1.8,0);group.add(bar);const stem=box(.025,1.2,.025,material(up?0xa9d8b3:0xb38d7f));stem.position.copy(bar.position);group.add(stem);});
      for(let i=0;i<3;i++){const plate=box(2.5,.045,1.3,material(0x1b332a));plate.position.set(1.2+i*.3,-1.3+i*.12,1.8+i*.35);group.add(plate);}
      group.rotation.y=-.35;
    } else if(type==='coins') {
      const coinMaterial=material(0xc8b0e5,.72);
      for(let i=0;i<7;i++){const coin=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.17,64),coinMaterial);coin.position.set(Math.sin(i*1.4)*1.6,(i-3)*.62,Math.cos(i*1.4)*.8);coin.rotation.set(.15,0,i*.1+.15);group.add(coin);}
      const halo=ring(3.5,0xbea7e3,.7);halo.rotation.z=.6;group.add(halo);group.rotation.x=.2;
    } else if(type==='time') {
      for(let i=0;i<24;i++){const angle=i/24*Math.PI*2;const tick=box(.055,i%6===0?.5:.25,.1,material(0xdac79f));tick.position.set(Math.sin(angle)*2.8,Math.cos(angle)*2.8,0);tick.rotation.z=-angle;group.add(tick);}
      const hand=box(.07,2.2,.07,material(0xdac79f));hand.position.y=1.1;const hands=new THREE.Group();hands.add(hand);hands.rotation.z=-.8;group.add(hands);group.userData.hands=hands;group.add(ring(3.1,0xb8a88a));
    } else if(type==='network'||type==='flow') {
      const positions=type==='flow'?[[-2.7,0,0],[0,0,.4],[2.7,0,0]]:[[-2.5,1,0],[-1,-1.5,.8],[0,0,0],[1.5,1.8,-.5],[2.5,-.8,1],[-.5,2.8,-1],[1,-2.5,-.4]];
      const color=type==='flow'?0xe8ae89:0xb8c6eb;
      positions.forEach((p,i)=>{const node=type==='flow'?box(1.15,1.15,1.15,material(color,.65)):sphere(i===2?.45:.2,material(color,.65));node.position.set(...p);group.add(node);if(i!==2||type==='flow'){const target=type==='flow'?positions[Math.max(0,i-1)]:positions[2];group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...p),new THREE.Vector3(...target)]),wire(color,.5)));}});
      const packet=sphere(.085,new THREE.MeshBasicMaterial({color}));group.add(packet);group.userData.packet=packet;group.userData.points=positions;group.rotation.y=-.25;
    } else if(type==='terrain') {
      const geometry=new THREE.PlaneGeometry(7,7,32,32);const positions=geometry.attributes.position;
      for(let i=0;i<positions.count;i++){const x=positions.getX(i),y=positions.getY(i);positions.setZ(i,Math.sin(x*.9)*Math.cos(y*.7)*.9+Math.exp(-(x*x+y*y)*.3)*1.5);}
      geometry.computeVertexNormals();const terrain=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x88bea6,wireframe:true,transparent:true,opacity:.6}));terrain.rotation.x=-1;terrain.rotation.z=-.25;group.add(terrain);
      for(let i=0;i<10;i++){const marker=sphere(.045,new THREE.MeshBasicMaterial({color:0xd2efe0}));marker.position.set(Math.sin(i*2.3)*2.4,Math.cos(i*1.2)*1.5,1);group.add(marker);}
    } else {
      for(let i=0;i<8;i++){const plate=box(3.2,.09,2,material(type==='code'?0x8d95a4:0xa7b9cd));plate.position.set(Math.sin(i*.8)*.6,(i-3.5)*.5,Math.cos(i*.8)*.4);plate.rotation.y=i*.07;group.add(plate);}
      group.rotation.set(.3,-.4,-.1);
    }
    worlds.set(type,group);root.add(group);group.visible=false;return group;
  }
  const starPositions=new Float32Array(450*3);
  for(let i=0;i<450;i++){const seed=Math.sin(i*127.1+311.7)*43758.5453;const f=seed-Math.floor(seed);starPositions[i*3]=(f-.5)*65;starPositions[i*3+1]=(Math.sin(i*3.7)*.5)*35;starPositions[i*3+2]=-5-(i%30);}
  const stars=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(starPositions,3)),new THREE.PointsMaterial({color:0xbfc2ce,size:.025,transparent:true,opacity:.6}));scene.add(stars);
  function set(type,color) {
    if(active)active.visible=false;
    theme=type;active=worlds.get(type)||makeWorld(type);active.visible=true;
    rim.color.set(color);camera.position.set(0,0,12);camera.rotation.set(0,0,0);root.rotation.set(0,0,0);
    renderStill();
  }
  function travelTo(type,color,direction) {
    travel?.kill();
    if(reduced.matches){set(type,color);return;}
    travel=gsap.timeline();
    travel.to(camera.position,{z:4,x:direction*1.7,duration:.65,ease:'power2.in'},0)
      .to(root.rotation,{y:-direction*.45,duration:.65,ease:'power2.in'},0)
      .call(()=>{set(type,color);camera.position.set(-direction*3,.6,18);root.rotation.y=direction*.5;})
      .to(camera.position,{x:0,y:0,z:12,duration:.95,ease:'power3.out'})
      .to(root.rotation,{y:0,duration:.95,ease:'power3.out'},'<');
  }
  function renderStill(){if(active&&!paused)renderer.render(scene,camera);}
  function animate(now) {
    frame=0;if(paused||document.hidden)return;
    const dt=Math.min((now-last)/1000||0,.04);last=now;
    if(!reduced.matches){clock+=dt;smoothPointer.lerp(pointer,.035);root.position.y=(innerWidth<700?.4:0)+smoothPointer.y*.15;root.position.x=(innerWidth<700?1.25:2.7)+smoothPointer.x*.2;
      if(active?.userData.globe)active.userData.globe.rotation.y+=dt*.025;
      if(active?.userData.satellite){active.userData.satellite.position.x=2.6+Math.sin(clock*.15)*.2;}
      if(active?.userData.packet){const points=active.userData.points;const p=(clock*.35)%(points.length-1);const i=Math.floor(p);active.userData.packet.position.lerpVectors(new THREE.Vector3(...points[i]),new THREE.Vector3(...points[i+1]),p-i);}
      if(active?.userData.hands)active.userData.hands.rotation.z=-clock*.035;
    }
    renderer.render(scene,camera);
    if(!reduced.matches)frame=requestAnimationFrame(animate);
  }
  function resume(){if(!frame&&!paused&&!document.hidden)frame=requestAnimationFrame(animate);}
  function size(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();root.position.set(innerWidth<700?1.25:2.7,innerWidth<700?.4:0,0);root.scale.setScalar(innerWidth<700?.75:1);renderStill();resume();}
  addEventListener('resize',size);
  addEventListener('pointermove',e=>{if(!reduced.matches&&e.pointerType==='mouse')pointer.set(e.clientX/innerWidth-.5,.5-e.clientY/innerHeight);},{passive:true});
  document.addEventListener('visibilitychange',resume);
  reduced.addEventListener('change',()=>{travel?.progress(1);pointer.set(0,0);smoothPointer.set(0,0);size();});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();paused=true;cancelAnimationFrame(frame);canvas.style.display='none';});
  set('origin','#e4b18c');size();
  return {set,travel:travelTo,pause(value){paused=value;if(value){cancelAnimationFrame(frame);frame=0;}else resume();}};
}
