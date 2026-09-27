import * as THREE from 'three';

// A continuous field of signals, not a collection of floating UI panels.
export function createSignalWorld(container,initialMotion,initialTheme){
 let renderer;
 try{const canvas=document.createElement('canvas');const context=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power'});if(!context)return null;renderer=new THREE.WebGLRenderer({canvas,context,antialias:true,alpha:true});}catch{return null;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0,0);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.1,120);
 const world=new THREE.Group();scene.add(world);
 let randomSeed=1987;const rand=()=>{randomSeed=(randomSeed*16807)%2147483647;return(randomSeed-1)/2147483646;};
 const count=9500,positions=new Float32Array(count*3),sizes=new Float32Array(count),colors=new Float32Array(count*3);
 for(let i=0;i<count;i++){
   const phi=rand()*Math.PI*2,costheta=rand()*2-1,sintheta=Math.sqrt(1-costheta*costheta);
   const r=i<6700?2.9+Math.pow(rand(),3)*.35:rand()*6;
   positions.set([r*sintheta*Math.cos(phi),r*costheta,r*sintheta*Math.sin(phi)],i*3);
   sizes[i]=i%29===0?3.1:rand()*1.4+.4;
   const warm=i%4!==0;colors.set(warm?[.87,.72,.49]:[.67,.79,.81],i*3);
 }
 const pointGeo=new THREE.BufferGeometry();pointGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));pointGeo.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));pointGeo.setAttribute('color',new THREE.BufferAttribute(colors,3));
 const uniforms={uTime:{value:0},uProgress:{value:0},uLight:{value:0},uPixelRatio:{value:renderer.getPixelRatio()}};
 const pointMat=new THREE.ShaderMaterial({uniforms,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
 vertexShader:`attribute float aSize; varying vec3 vColor; uniform float uTime; uniform float uProgress; uniform float uPixelRatio; void main(){vColor=color;vec3 p=position;float wave=sin(p.y*2.0+uTime*.3)*.035;p*=1.0+wave;float gather=smoothstep(.45,1.0,uProgress);p.y*=1.0-gather*.16;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=min(8.,aSize*uPixelRatio*13./-mv.z);}`,
 fragmentShader:`varying vec3 vColor;uniform float uLight;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float a=pow(1.-d,1.8);vec3 c=mix(vColor,vec3(.28,.21,.12),uLight);gl_FragColor=vec4(c,a*.86);}`});
 const cloud=new THREE.Points(pointGeo,pointMat);world.add(cloud);
 const lattice=new THREE.Group();world.add(lattice);
 const lines=[],curves=[];
 function path(points,opacity=.2,color=0xd1b47e){
   const curve=new THREE.CatmullRomCurve3(points);curves.push(curve);
   const geometry=new THREE.BufferGeometry().setFromPoints(curve.getPoints(150));
   const material=new THREE.LineBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false});
   const mesh=new THREE.Line(geometry,material);lattice.add(mesh);lines.push({mesh,opacity});return curve;
 }
 // Meridians become a spatial network, with slightly different curves at each longitude.
 for(let j=0;j<42;j++){
   const points=[];const phi=j/42*Math.PI*2;
   for(let k=0;k<=40;k++){const t=k/40*Math.PI;const twist=Math.sin(t*2)*.16;
     points.push(new THREE.Vector3(3*Math.sin(t)*Math.cos(phi+twist),3*Math.cos(t),3*Math.sin(t)*Math.sin(phi+twist)));}
   path(points,j%5===0?.4:.13,j%7===0?0xe8d0a2:0x9aafaa);
 }
 for(let j=1;j<19;j++){
   const theta=j/19*Math.PI,points=[];
   for(let k=0;k<=80;k++){const phi=k/80*Math.PI*2;points.push(new THREE.Vector3(3*Math.sin(theta)*Math.cos(phi),3*Math.cos(theta),3*Math.sin(theta)*Math.sin(phi)));}
   path(points,.09,0xbca778);
 }
 // Incoming ideas converge, then leave as connected paths to product outcomes.
 for(let i=0;i<28;i++){
   const angle=i/28*Math.PI*2,z=Math.sin(angle)*2.4,y=Math.cos(angle)*2.4;
   path([new THREE.Vector3(-10,y*1.8,z*1.8),new THREE.Vector3(-5,y*.6,z),new THREE.Vector3(-1.4,y*.3,z*.3),new THREE.Vector3(0,0,0),new THREE.Vector3(2,y*.8,z),new THREE.Vector3(6,y*1.6,z*1.6)],i%4===0?.4:.12,i%4===0?0xedd5a5:0x6f9290);
 }
 const nodePositions=[];
 for(let i=0;i<240;i++){
   const y=1-(i/239)*2,r=Math.sqrt(1-y*y),a=i*Math.PI*(3-Math.sqrt(5));nodePositions.push(new THREE.Vector3(Math.cos(a)*r*2.93,y*2.93,Math.sin(a)*r*2.93));
 }
 const network=[];
 for(let i=0;i<nodePositions.length;i++)for(let j=i+1;j<nodePositions.length;j++){
   if(nodePositions[i].distanceTo(nodePositions[j])<.75){network.push(...nodePositions[i].toArray(),...nodePositions[j].toArray());}
 }
 const networkGeo=new THREE.BufferGeometry();networkGeo.setAttribute('position',new THREE.Float32BufferAttribute(network,3));
 const networkMat=new THREE.LineBasicMaterial({color:0xbfa77b,transparent:true,opacity:.13,depthWrite:false,blending:THREE.AdditiveBlending});world.add(new THREE.LineSegments(networkGeo,networkMat));
 // A luminous seed at the convergence point, with a soft optical halo.
 const glowMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{light:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 vUv;uniform float light;void main(){float r=length(vUv-.5);float core=exp(-r*80.);float halo=exp(-r*12.)*.15;vec3 c=mix(vec3(1.,.77,.4),vec3(.28,.16,.05),light);gl_FragColor=vec4(c,(core+halo)*(1.-light*.45));}`});
 const glow=new THREE.Mesh(new THREE.PlaneGeometry(8,8),glowMaterial);world.add(glow);
 const seed=new THREE.Mesh(new THREE.IcosahedronGeometry(.055,2),new THREE.MeshBasicMaterial({color:0xffecd1}));world.add(seed);
 const packetPositions=new Float32Array(160*3),packetGeo=new THREE.BufferGeometry();packetGeo.setAttribute('position',new THREE.BufferAttribute(packetPositions,3));
 const packetMat=new THREE.PointsMaterial({color:0xf5d6a0,size:.035,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false});const packets=new THREE.Points(packetGeo,packetMat);world.add(packets);
 const starsPos=new Float32Array(1000*3);for(let i=0;i<starsPos.length;i+=3)starsPos.set([(rand()-.5)*35,(rand()-.5)*24,-rand()*15-3],i);
 const starsGeo=new THREE.BufferGeometry();starsGeo.setAttribute('position',new THREE.BufferAttribute(starsPos,3));const stars=new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0x8d9d9c,size:.015,transparent:true,opacity:.4}));scene.add(stars);
 container.append(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
 let motion=initialMotion,visible=true,raf=0,progress=0,targetProgress=0,time=0,last=0,px=0,py=0,drag=false,lastX=0,rotation=0,settling=0;
 let mobile=false;
 const shots=[new THREE.Vector3(0,.4,13),new THREE.Vector3(-1.5,2.3,10.4),new THREE.Vector3(3.4,.7,7.6),new THREE.Vector3(.4,3.2,12)];
 function draw(now=0){
   raf=0;const dt=Math.min((now-last)/1000,.05);last=now;if(motion)time+=Math.max(0,dt);
   progress+=(targetProgress-progress)*(motion?.045:1);
   uniforms.uProgress.value=progress;uniforms.uTime.value=time;
   world.position.set(mobile?1.1:3.1,mobile?-1.15:0,0);
   world.rotation.y=time*.017+rotation;world.rotation.z=-.18+Math.sin(progress*Math.PI)*.22;
   const shot=Math.min(2,Math.floor(progress*3)),blend=progress*3-shot;
   camera.position.lerpVectors(shots[shot],shots[shot+1],blend);
   camera.position.x+=px*.38;camera.position.y+=py*.25;
   if(mobile){camera.position.z+=3.8;camera.position.y+=1.3;}
   camera.lookAt(mobile?0:.9,mobile?.7:0,0);glow.quaternion.copy(camera.quaternion);
   for(let i=0;i<160;i++){const curve=curves[(i*7)%curves.length],p=curve.getPoint((time*.045+i/160)%1);packetPositions.set(p.toArray(),i*3);}
   packetGeo.attributes.position.needsUpdate=true;
   networkMat.opacity=.1+progress*.18;
   lines.forEach(({mesh,opacity})=>mesh.material.opacity=opacity*(.7+progress*.7));
   renderer.render(scene,camera);
   if(visible&&!document.hidden&&(motion||settling-->0))raf=requestAnimationFrame(draw);
 }
 function wake(){if(visible&&!document.hidden&&!raf){last=performance.now();raf=requestAnimationFrame(draw);}}
 function resize(){const r=container.getBoundingClientRect();if(!r.width||!r.height)return;mobile=r.width<760;camera.aspect=r.width/r.height;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height);settling=1;wake();}
 new ResizeObserver(resize).observe(container);resize();
 container.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag=true;lastX=e.clientX;container.setPointerCapture(e.pointerId);});
 container.addEventListener('pointermove',e=>{const r=container.getBoundingClientRect();if(drag){rotation+=(e.clientX-lastX)*.004;lastX=e.clientX;settling=2;wake();}else if(motion&&e.pointerType==='mouse'){px=(e.clientX-r.left)/r.width-.5;py=(e.clientY-r.top)/r.height-.5;}});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])container.addEventListener(ev,()=>drag=false);
 container.addEventListener('pointerleave',()=>{px=0;py=0;});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);raf=0;visible=false;container.parentElement.dataset.renderer='fallback';renderer.domElement.style.display='none';});
 function setTheme(value){const light=value==='light';uniforms.uLight.value=light?1:0;glowMaterial.uniforms.light.value=light?1:0;pointMat.blending=light?THREE.NormalBlending:THREE.AdditiveBlending;pointMat.needsUpdate=true;lines.forEach(({mesh})=>{mesh.material.blending=light?THREE.NormalBlending:THREE.AdditiveBlending;mesh.material.needsUpdate=true;});networkMat.blending=light?THREE.NormalBlending:THREE.AdditiveBlending;networkMat.needsUpdate=true;settling=1;wake();}
 setTheme(initialTheme);wake();
 return {setProgress(value){targetProgress=value;settling=2;wake();},setTheme,setVisible(value){visible=value;if(!value){cancelAnimationFrame(raf);raf=0;}else wake();},setMotion(value){motion=value;settling=1;wake();},reset(){rotation=0;px=0;py=0;settling=2;wake();}};
}
