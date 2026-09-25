import * as THREE from 'three';

// Architectural models, built from the same primitives as the systems they describe.
export function createSculpture(canvas,enabled,options={}){
 const mode=options.mode||'hero';let renderer;
 try{renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});}catch{return {setMotion(){},setExpanded(){},setActive(){}};}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setClearColor(0x000000,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
 const scene=new THREE.Scene();const camera=mode==='hero'?new THREE.PerspectiveCamera(34,1,.1,80):new THREE.OrthographicCamera(-6,6,2,-2,.1,80);
 camera.position.set(...(mode==='hero'?[6,4.4,7.8]:[1.3,6.5,11.6]));camera.lookAt(0,0,0);
 const group=new THREE.Group();scene.add(group);
 scene.add(new THREE.HemisphereLight(0xd4e5ee,0x19160f,2.2));
 const key=new THREE.DirectionalLight(0xffe1c0,4);key.position.set(2,6,5);scene.add(key);
 const rim=new THREE.DirectionalLight(0xff7235,4);rim.position.set(-5,2,-3);scene.add(rim);
 const fill=new THREE.DirectionalLight(0xb7d7dd,2);fill.position.set(4,0,-4);scene.add(fill);
 const orange=new THREE.MeshStandardMaterial({color:0xff753b,roughness:.28,metalness:.55,emissive:0xff3c0a,emissiveIntensity:.18});
 const metal=new THREE.MeshStandardMaterial({color:0x52635e,roughness:.36,metalness:.75});
 const pale=new THREE.MeshStandardMaterial({color:0xb3b9ac,roughness:.3,metalness:.8});
 const dark=new THREE.MeshStandardMaterial({color:0x15211c,roughness:.35,metalness:.72});
 const glass=new THREE.MeshStandardMaterial({color:0x657e71,roughness:.24,metalness:.45,transparent:true,opacity:.43,depthWrite:false});
 const geometries=[];function box(w,h,d,material,x=0,y=0,z=0,parent=group){const geo=new THREE.BoxGeometry(w,h,d);geometries.push(geo);const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);parent.add(m);return m;}
 function outline(w,h,d,color,x,y,z,parent=group,opacity=.55){const g=new THREE.EdgesGeometry(new THREE.BoxGeometry(w,h,d));const l=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color,transparent:true,opacity}));l.position.set(x,y,z);parent.add(l);return l;}
 function trace(points,color,parent=group,opacity=.5){const g=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));const l=new THREE.Line(g,new THREE.LineBasicMaterial({color,transparent:true,opacity}));parent.add(l);return l;}
 const plates=[],nodes=[],routes=[],packets=[];let active=0,expanded=false,expansion=0,clock=0;
 const grid=new THREE.GridHelper(mode==='hero'?12:18,mode==='hero'?32:36,0x536457,0x293b30);grid.position.y=mode==='hero'?-2.3:-.9;grid.material.transparent=true;grid.material.opacity=.27;scene.add(grid);
 if(mode==='hero'){
  for(let i=0;i<4;i++){
   const p=new THREE.Group();p.userData.level=i;plates.push(p);group.add(p);
   box(3.2,.11,2.5,i===1?metal:glass,0,0,0,p);outline(3.2,.12,2.5,i===2?0xff854b:0xbac5b7,0,0,0,p,.6);
   box(1.12,.22,.88,i===2?orange:dark,0,.17,0,p);outline(1.12,.22,.88,i===2?0xffaa72:0x879b8b,0,.17,0,p,.65);
   for(let n=0;n<9;n++){
    const x=-.48+n*.12;box(.045,.065,.15,pale,x,.15,.52,p);box(.045,.065,.15,pale,x,.15,-.52,p);
   }
   for(let j=0;j<4;j++){
    const side=j%2?1:-1,z=j<2?-.6:.6;
    trace([[side*1.48,.075,z],[side*.95,.075,z],[side*.7,.075,z*.5],[side*.55,.075,z*.5]],i===2?0xff985f:0x9eb8a4,p,.75);
    box(.32,.08,.3,j===i?orange:metal,side*1.25,.11,z,p);
    box(.065,.045,.1,pale,side*1.48,.1,z+.22,p);
   }
   for(const x of [-1.47,1.47])for(const z of [-1.12,1.12]){box(.07,.22,.07,pale,x,.05,z,p);}
  }
  for(const x of [-1.48,1.48])for(const z of [-1.12,1.12]){trace([[x,-1.7,z],[x,1.7,z]],0x9ba88e,group,.25);const particle=new THREE.Mesh(new THREE.BoxGeometry(.055,.16,.055),orange);particle.userData={x,z,offset:packets.length/4};group.add(particle);packets.push(particle);}
  box(3.5,.14,2.8,dark,0,-1.82,0);outline(3.5,.14,2.8,0xff8b51,0,-1.82,0,group,.35);
 }else{
  for(let i=0;i<5;i++){
   const node=new THREE.Group();node.position.set((i-2)*2,0,i%2?.42:-.22);node.userData.index=i;group.add(node);nodes.push(node);
   box(1.28,.16,1.18,dark,0,-.2,0,node);outline(1.28,.16,1.18,0x899788,0,-.2,0,node,.4);
   const core=box(.88,.4,.77,metal,0,.08,0,node);node.userData.core=core;
   outline(.9,.42,.79,0xb6caba,0,.08,0,node,.5);
   box(.98,.045,.88,glass,0,.38,0,node);outline(.98,.045,.88,0xff9a61,0,.38,0,node,.5);
   for(let n=0;n<4;n++)box(.045,.045,.18,pale,-.3+n*.2,-.08,.48,node);
  }
  for(let i=0;i<4;i++){
   const a=nodes[i].position,b=nodes[i+1].position;
   const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(a.x+.6,-.1,a.z),new THREE.Vector3(a.x+1,-.1,a.z),new THREE.Vector3(a.x+1,-.1,b.z),new THREE.Vector3(b.x-.6,-.1,b.z)]);
   const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(45)),new THREE.LineBasicMaterial({color:0x94b296,transparent:true,opacity:.45}));group.add(line);routes.push(curve);
   const packet=new THREE.Mesh(new THREE.SphereGeometry(.055,8,8),orange);group.add(packet);packets.push(packet);
  }
 }
 const parent=canvas.parentElement;parent.classList.add('ready');let visible=false,frame=0,motion=enabled,px=0,py=0,last=0,lost=false;
 function placeLabels(){if(mode!=='system')return;const labels=parent.querySelectorAll('.system-node');nodes.forEach((node,i)=>{const v=new THREE.Vector3(0,.75,0);node.localToWorld(v);v.project(camera);if(labels[i]){labels[i].style.left=`${(v.x*.5+.5)*100}%`;labels[i].style.top=`${Math.max((labels[i].offsetHeight+18)/parent.clientHeight*100,(-v.y*.5+.5)*100)}%`;}});}
 function render(dt){
  clock+=dt;expansion+=(Number(expanded)-expansion)*.08;
  const rect=parent.getBoundingClientRect();const travel=motion?Math.max(0,Math.min(1,-rect.top/Math.max(innerHeight,1))):0;
  group.rotation.y=(mode==='hero'?-.18:0)+px*.2+(mode==='hero'?Math.sin(clock*.16)*.12+travel*.25:0);group.rotation.x=py*.06;
  if(mode==='hero'){
   plates.forEach((p,i)=>{p.position.y=(i-1.5)*(.72+expansion*.28+travel*.15);p.position.x=Math.sin(clock*.3+i)*.025;p.rotation.y=Math.sin(clock*.16+i*.3)*.018;});
   packets.forEach(p=>{p.position.set(p.userData.x,((clock*.28+p.userData.offset)%1)*3.1-1.55,p.userData.z);});
  }else{
   nodes.forEach((n,i)=>{n.position.y=Math.sin(clock*.6+i)*.025;n.userData.core.material=i===active?orange:metal;});
   packets.forEach((p,i)=>{p.position.copy(routes[i].getPoint(((clock*.4+i*.16)%1+1)%1));p.visible=i<active;});
  }
  renderer.render(scene,camera);placeLabels();
 }
 function resize(){const w=parent.clientWidth,h=mode==='system'&&innerWidth<=600?260:parent.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;if(mode==='hero'){camera.position.set(6,4.4,7.8);if(w/h<.8)camera.position.multiplyScalar(1.12);}else{camera.position.set(1.3,6.5,11.6);camera.left=-6;camera.right=6;camera.top=6/(w/h);camera.bottom=-camera.top;}camera.lookAt(0,0,0);camera.updateProjectionMatrix();render(0);}
 function loop(t){frame=0;if(!motion||!visible||document.hidden||lost)return;const dt=Math.max(0,Math.min((t-last)/1000,.05));last=t;render(dt);frame=requestAnimationFrame(loop);}
 function start(){if(!frame&&motion&&visible&&!document.hidden&&!lost){last=performance.now();frame=requestAnimationFrame(loop);}}
 function stop(){cancelAnimationFrame(frame);frame=0;}
 new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible){render(0);start();}else stop();}).observe(canvas);
 new ResizeObserver(resize).observe(parent);
 canvas.addEventListener('pointermove',e=>{if(!motion)return;const r=canvas.getBoundingClientRect();px=(e.clientX-r.left)/r.width-.5;py=(e.clientY-r.top)/r.height-.5;});canvas.addEventListener('pointerleave',()=>{px=py=0;});
 document.addEventListener('visibilitychange',()=>document.hidden?stop():start());canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;stop();parent.classList.remove('ready');});canvas.addEventListener('webglcontextrestored',()=>{lost=false;parent.classList.add('ready');resize();start();});resize();start();
 return {setMotion(value){motion=value;if(motion)start();else{stop();px=py=0;expansion=Number(expanded);render(0);}},setExpanded(value){expanded=value;if(!motion){expansion=Number(value);render(0);}},setActive(index){active=index;render(0);}};
}
