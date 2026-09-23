import * as THREE from 'three';

// A single shader pass; CSS supplies a static composition if WebGL is unavailable.
export function createAtmosphere(canvas, reduced) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.35));
  const scene = new THREE.Scene(), camera = new THREE.Camera();
  const uniforms = { uTime: { value: 0 }, uSize: { value: new THREE.Vector2() }, uPointer: { value: new THREE.Vector2() } };
  const material = new THREE.ShaderMaterial({ transparent: true, uniforms,
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position,1.0);}',
    fragmentShader: `precision highp float;
    varying vec2 vUv; uniform float uTime; uniform vec2 uSize; uniform vec2 uPointer;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    float fbm(vec2 p){float a=.5,v=0.;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec2(4.1,2.3);a*=.5;}return v;}
    void main(){
      vec2 p=vUv-vec2(.72,.50);p.x*=uSize.x/uSize.y;p+=uPointer*.012;
      float t=uTime*.035;
      float ang=-.58;mat2 rot=mat2(cos(ang),-sin(ang),sin(ang),cos(ang));vec2 q=rot*p;
      float r=length(vec2(q.x,q.y*2.65));float theta=atan(q.y*2.65,q.x);
      float n=fbm(vec2(theta*3.+t,r*17.-t));
      float ring=exp(-abs(r-.44-n*.065)*54.);
      float outer=exp(-abs(r-.48)*9.)*.13;
      float trails=pow(max(0.,sin(r*100.+n*9.-t*2.)),9.)*exp(-abs(r-.52)*15.)*.24;
      float glow=(ring+trails+outer)*(.48+.52*sin(theta+1.6));
      float dust=pow(noise(vUv*uSize*.45),25.)*.12;
      vec3 col=vec3(1.,.48,.23)*glow+vec3(.7,.48,.32)*dust;
      float edge=smoothstep(0.,.25,vUv.x)*smoothstep(0.,.15,vUv.y);
      gl_FragColor=vec4(col,clamp((glow*.9+dust)*edge,0.,.9));
    }`,
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));
  const hero = document.querySelector('.hero');
  let visible = true, frame = 0, time = 0, previous = 0;
  function draw(now) {
    frame = 0;
    if (!visible || document.hidden) return;
    if (!reduced.matches) time += Math.min((now-previous)/1000 || 0,.05);
    previous = now; uniforms.uTime.value = time;
    renderer.render(scene,camera);
    if (!reduced.matches) frame = requestAnimationFrame(draw);
  }
  function resume(){ if (!frame && visible && !document.hidden) frame=requestAnimationFrame(draw); }
  const size = () => { renderer.setSize(hero.clientWidth,hero.clientHeight,false);uniforms.uSize.value.set(hero.clientWidth,hero.clientHeight);resume(); };
  const resize = new ResizeObserver(size);resize.observe(hero);
  const observer = new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(!visible){cancelAnimationFrame(frame);frame=0;}else resume();});observer.observe(hero);
  document.addEventListener('visibilitychange',resume);
  reduced.addEventListener('change',()=>{uniforms.uPointer.value.set(0,0);resume();});
  hero.addEventListener('pointermove',(event)=>{if(!reduced.matches&&event.pointerType==='mouse')uniforms.uPointer.value.set(event.clientX/innerWidth-.5,event.clientY/innerHeight-.5);},{passive:true});
  canvas.addEventListener('webglcontextlost',(event)=>{event.preventDefault();cancelAnimationFrame(frame);frame=0;canvas.style.opacity='0';});
  size();renderer.render(scene,camera);
}
