import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

function surfaceTexture(level){
 const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=800;
 const ctx=canvas.getContext('2d');if(!ctx)return null;
 const ink='#ecede7',dim='#88988e',warm='#dcb980';
 ctx.fillStyle=level===3?'#e4e7dd':'#1b2420';ctx.fillRect(0,0,1200,800);
 function text(value,x,y,size=20,color=ink,font='monospace'){ctx.fillStyle=color;ctx.font=`${size}px ${font}`;ctx.fillText(value,x,y);}
 function line(points,color='#52655a',width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
 function rect(x,y,w,h,color,r=0){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
 if(level===3){
   rect(0,0,1200,85,'#cbd2c5');text('m / MoneyFest',45,52,25,'#24362a','sans-serif');text('MARKET INTELLIGENCE',820,50,17,'#506457');
   text('The story behind the move.',48,174,43,'#1b3023','sans-serif');text('SIGNALS. EVIDENCE. CONTEXT.',48,217,16,'#677b6c');
   rect(48,255,740,297,'#f1f3eb',12);text('PRICE MOVEMENT / ILLUSTRATIVE SERIES',72,293,15,'#718273');
   for(let i=0;i<4;i++)line([[70,340+i*52],[760,340+i*52]],'#dbe1d5',1);
   const pts=Array.from({length:29},(_,i)=>[75+i*24,480-i*4-Math.sin(i*1.7)*22-(i>19?45:0)]);line(pts,'#5a785b',5);
   rect(813,255,339,297,'#253b2c',12);text('EVIDENCE FIRST',840,297,17,'#c1d5b9');text('Gate',840,363,30);text('Verify',840,422,30);text('Cite',840,481,30,warm);
   rect(48,578,1104,167,'#d3dacb',12);text('ATTRIBUTION / VERIFIED CLAIMS',72,616,16,'#60785e');text('Trace every explanation to its source.',72,662,28,'#2e4933','sans-serif');text('An honest answer can be: no clear driver.',72,706,21,'#587058','sans-serif');
 }else{
   for(let x=0;x<1200;x+=40)for(let y=0;y<800;y+=40){ctx.fillStyle='#33463a';ctx.fillRect(x,y,2,2);}
   text(['01 / DATA FOUNDATION','02 / APPLICATION SERVICES','03 / REASONING & VERIFICATION'][level],40,57,22,dim);
   text(['SQLITE / EVIDENCE STORE','FASTAPI / PYTHON','GROQ / ANTHROPIC'][level],40,749,20,warm);
   for(let i=0;i<10;i++){
     let y=140+i*48;
     line([[0,y],[180+i*17,y],[290+i*13,400],[480,400]],i%3===0?'#9a835e':'#476451',i%3===0?3:2);
     line([[1200,y],[1020-i*17,y],[910-i*13,400],[720,400]],i%3===0?'#9a835e':'#476451',2);
     ctx.fillStyle=warm;ctx.beginPath();ctx.arc(180+i*17,y,3,0,Math.PI*2);ctx.fill();
   }
   rect(441,250,318,290,'#789380',15);rect(450,259,300,272,'#101a14',12);
   for(let i=0;i<12;i++){rect(465+i*23,234,10,18,'#afbaa8');rect(465+i*23,547,10,18,'#afbaa8');}
   text(['DATA','API','AI'][level],level===0?480:level===1?507:539,419,level===0?73:90,ink,'sans-serif');
   text(['PERSIST / TRACE','GATE / ROUTE','VERIFY / CITE'][level],478,478,20,warm);
   for(let i=0;i<4;i++){rect(80+i*52,637,36,13,dim,3);rect(900+i*52,637,36,13,dim,3);}
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}

export function createAssembly(container,initialMotion,initialTheme){
 let renderer;
 try{const canvas=document.createElement('canvas');const context=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power'});if(!context)return null;renderer=new THREE.WebGLRenderer({canvas,context,alpha:true,antialias:true});}catch{return null;}
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(34,1,.1,80);camera.position.set(7.6,6.8,10.5);camera.lookAt(0,.15,0);
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setClearColor(0,0);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
 const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();const environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xe5f1e4,0x3c493a,3));
 const key=new THREE.DirectionalLight(0xffedd6,5);key.position.set(-4,7,4);scene.add(key);
 const rim=new THREE.DirectionalLight(0xd5e6eb,4);rim.position.set(5,2,-3);scene.add(rim);
 const assembly=new THREE.Group();assembly.rotation.y=-.32;scene.add(assembly);
 const plates=[],bolts=[];
 const metal=new THREE.MeshStandardMaterial({color:0x8f9e94,metalness:.94,roughness:.22});
 const darkMetal=new THREE.MeshStandardMaterial({color:0x36433b,metalness:.8,roughness:.24});
 const signal=new THREE.MeshStandardMaterial({color:0xdaba82,emissive:0xdaba82,emissiveIntensity:1.2,roughness:.35,metalness:.55});
 for(let i=0;i<4;i++){
   const layer=new THREE.Group();layer.position.y=(i-1.5)*.95;
   const body=new THREE.Mesh(new RoundedBoxGeometry(4.6,.14,3.12,3,.065),i===3?metal:darkMetal);layer.add(body);
   const texture=surfaceTexture(i);if(!texture){renderer.dispose();environment.dispose();return null;}
   const face=new THREE.Mesh(new THREE.PlaneGeometry(4.35,2.9),new THREE.MeshStandardMaterial({map:texture,metalness:.25,roughness:.4,emissive:0xffffff,emissiveMap:texture,emissiveIntensity:.13}));face.rotation.x=-Math.PI/2;face.position.y=.076;layer.add(face);
   const lip=new THREE.Mesh(new THREE.BoxGeometry(4.32,.014,.014),i===2?signal:metal);lip.position.set(0,-.045,1.567);layer.add(lip);
   for(const x of [-2.19,2.19])for(const z of [-1.43,1.43]){
     const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.02,10),metal);bolt.position.set(x,.083,z);layer.add(bolt);bolts.push(bolt);
   }
   for(let k=0;k<5;k++){const pin=new THREE.Mesh(new THREE.BoxGeometry(.12,.035,.07),k===0?signal:metal);pin.position.set(-1.65+k*.19,0,1.59);layer.add(pin);}
   assembly.add(layer);plates.push(layer);
 }
 // Slim vertical traces connect the conceptual layers.
 const paths=[];
 for(const x of [-1.9,1.9])for(const z of [-1.17,1.17]){
   const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,-1.45,z),new THREE.Vector3(x,1.45,z)]);
   const line=new THREE.Line(geometry,new THREE.LineDashedMaterial({color:0x8a9e8b,dashSize:.055,gapSize:.09,transparent:true,opacity:.32}));line.computeLineDistances();assembly.add(line);paths.push(line);
 }
 const packets=[];
 for(let i=0;i<12;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.023,6,6),signal);assembly.add(p);packets.push(p);}
 const ring=new THREE.Mesh(new THREE.RingGeometry(2.65,2.657,120),new THREE.MeshBasicMaterial({color:0x6a7f6e,transparent:true,opacity:.24,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=-1.95;assembly.add(ring);
 // A soft contact shadow grounds the assembly without an external image.
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;const sc=shadowCanvas.getContext('2d');
 if(sc){const g=sc.createRadialGradient(64,64,6,64,64,64);g.addColorStop(0,'rgba(0,0,0,.48)');g.addColorStop(1,'rgba(0,0,0,0)');sc.fillStyle=g;sc.fillRect(0,0,128,128);const shadow=new THREE.Mesh(new THREE.PlaneGeometry(9,7),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-2;scene.add(shadow);}
 container.append(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
 let motion=initialMotion,visible=true,frame=0,step=2,rotation=-.32,tilt=0,drag=false,lastX=0,lastTime=0,elapsed=0,settling=0;
 const positions=[[-1.35,-1.12,-.89,-.66],[-1.4,-.35,.7,1.75],[-1.5,-.5,.65,1.85],[-.3,-.08,.14,.36]];
 function update(snap=false){
   const ease=snap?1:.075;
   plates.forEach((p,i)=>{p.position.y+=(positions[step][i]-p.position.y)*ease;const size=step===0?(i===0?1:.82):1;p.scale.lerp(new THREE.Vector3(size,1,size),ease);});
   assembly.rotation.y+=(rotation-assembly.rotation.y)*ease;
   assembly.rotation.x+=(tilt-assembly.rotation.x)*ease;
   paths.forEach(p=>{p.visible=step===1||step===2;});
   packets.forEach((p,i)=>{p.visible=motion&&(step===1||step===2);p.position.set(i%2?1.9:-1.9,((elapsed*.42+i*.27)%3.2)-1.4,i%4<2?-1.17:1.17);});
 }
 function render(time=0){frame=0;const dt=Math.min((time-lastTime)/1000,.04);lastTime=time;if(motion)elapsed+=Math.max(0,dt);update(!motion);renderer.render(scene,camera);if(visible&&!document.hidden&&(motion||settling-->0))frame=requestAnimationFrame(render);}
 function wake(){if(!visible||document.hidden)return;if(!frame){lastTime=performance.now();frame=requestAnimationFrame(render);}}
 function resize(){const r=container.getBoundingClientRect();if(!r.width||!r.height)return;camera.aspect=r.width/r.height;camera.position.set(7.6,6.8,10.5).multiplyScalar(camera.aspect<.9?1.16:1);camera.updateProjectionMatrix();renderer.setSize(r.width,r.height);settling=1;wake();}
 const ro=new ResizeObserver(resize);ro.observe(container);resize();
 container.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag=true;lastX=e.clientX;container.setPointerCapture(e.pointerId);});
 container.addEventListener('pointermove',e=>{if(drag){rotation=Math.max(-1.8,Math.min(1.1,rotation+(e.clientX-lastX)*.007));lastX=e.clientX;settling=30;wake();}else if(e.pointerType==='mouse'&&motion){const r=container.getBoundingClientRect();tilt=(e.clientY-r.top-r.height/2)/r.height*.08;}});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])container.addEventListener(event,()=>drag=false);
 container.addEventListener('pointerleave',()=>{tilt=0;});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(frame);frame=0;visible=false;container.closest('.engine-stage').dataset.renderer='fallback';renderer.domElement.style.display='none';});
 function setTheme(value){renderer.toneMappingExposure=value==='light'?1.05:1.35;settling=1;wake();}
 setTheme(initialTheme);wake();
 return {setStep(value){step=value;settling=50;wake();},setTheme,setMotion(value){motion=value;settling=1;wake();},setVisible(value){visible=value;if(!visible){cancelAnimationFrame(frame);frame=0;}else wake();},reset(){rotation=-.32;tilt=0;settling=40;wake();}};
}
