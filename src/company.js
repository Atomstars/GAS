import './company.css';
import './home-premium.css';
import { catalog, repoUrl } from './data/studioCatalog.js';
const $ = selector => document.querySelector(selector);
const engine = $('#idea-engine');
const scene = $('#engine-scene');
const media = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = media.matches;
let stage = 0, playing = false, elapsed = 0, lastTime = 0, visible = true;
const duration = 4300;
$('#stage-title').setAttribute('aria-live', 'polite');
const frames = [
  ['01 / THE SPARK', 'It starts with a possibility.', 'Different thoughts. Unexplored directions. Room to imagine.'],
  ['02 / THE CONNECTION', 'Give the idea a structure.', 'Purpose, design, and engineering. Working as one system.'],
  ['03 / THE REALITY', 'Make something that matters.', 'A useful product. A connected platform. Your idea, made real.'],
];
function setStage(value) {
  stage = value;
  engine.dataset.stage = String(value);
  scene.setAttribute('aria-label', `${frames[value][1]} Activate to explore ${['structure', 'the finished product', 'ideas'][value]}.`);
  $('#stage-kicker').textContent = frames[value][0];
  $('#stage-title').textContent = frames[value][1];
  $('#stage-description').textContent = frames[value][2];
  document.querySelectorAll('[data-stage-button]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.stageButton) === value)));
  $('#film-progress').style.width = `${value / 2 * 100}%`;
  if (reduced) draw(performance.now());
}
function setPlaying(value) {
  playing = value;
  $('#play-film').setAttribute('aria-pressed', String(value));
  $('#play-film').innerHTML = value ? '<span>Ⅱ</span> Pause the story' : '<span>▶</span> Play the story';
  $('#stage-title').setAttribute('aria-live', value ? 'off' : 'polite');
}
document.querySelectorAll('[data-stage-button]').forEach(button => button.addEventListener('click', () => {
  setPlaying(false); elapsed = 0; setStage(Number(button.dataset.stageButton));
}));
$('#play-film').addEventListener('click', () => {
  if (!playing && stage === 2 && elapsed === 0) setStage(0);
  setPlaying(!playing);
});
function applyMotion() {
  document.body.classList.toggle('motion-reduced', reduced);
  $('#motion-toggle').setAttribute('aria-pressed', String(reduced));
  $('#motion-toggle').textContent = reduced ? 'Motion reduced' : 'Reduce motion';
  $('.sculpture').style.translate = '0px 0px';
  setPlaying(false);
  draw(performance.now());
}
$('#motion-toggle').addEventListener('click', () => { reduced = !reduced; applyMotion(); });
media.addEventListener('change', e => { reduced = e.matches; applyMotion(); });
const canvas = $('#idea-canvas');
const context = canvas.getContext('2d');
let width = 0, height = 0;
let pointer = {x: -1000, y: -1000};
const particles = Array.from({length: 120}, (_,i) => ({
  x: (Math.sin(i * 91.17) * 0.5 + 0.5), y: (Math.cos(i * 35.37) * 0.5 + 0.5), phase:i * 2.4, currentX:null, currentY:null,
}));
function resize() {
  const r = scene.getBoundingClientRect(); width = r.width; height = r.height;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = width * dpr; canvas.height = height * dpr;
  context?.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw(performance.now());
}
new ResizeObserver(resize).observe(scene);
function draw(now) {
  if (!context) return;
  context.clearRect(0,0,width,height);
  const t = reduced ? 0 : now * .00015;
  const positions = particles.map((p,i) => {
    const scatterX = p.x * width * .9 + width * .05 + Math.sin(t+p.phase)*8;
    const scatterY = p.y * height * .62 + height * .07 + Math.cos(t+p.phase)*8;
    const gridX = width * .5 + (i % 12 - 5.5) * Math.min(width * .045, 30);
    const gridY = height * .43 + (Math.floor(i / 12) - 4.5) * 22;
    const targetX = stage === 0 ? scatterX : gridX, targetY = stage === 0 ? scatterY : gridY;
    p.currentX = reduced || p.currentX === null ? targetX : p.currentX + (targetX - p.currentX) * .045;
    p.currentY = reduced || p.currentY === null ? targetY : p.currentY + (targetY - p.currentY) * .045;
    return {x:p.currentX, y:p.currentY};
  });
  positions.forEach((p,i) => {
    const near = Math.hypot(pointer.x-p.x,pointer.y-p.y)<115;
    context.fillStyle=near?'#2649ff': stage === 2 ? '#3459ff10' : '#3459ff80';
    context.beginPath(); context.arc(p.x,p.y,near?2:1.3,0,Math.PI*2);context.fill();
    if (near && !reduced) { context.strokeStyle='#3459ff45';context.beginPath();context.moveTo(p.x,p.y);context.lineTo(pointer.x,pointer.y);context.stroke(); }
    if(stage===1 && i%12!==11 && positions[i+1]) {context.strokeStyle='#3459ff30';context.beginPath();context.moveTo(p.x,p.y);context.lineTo(positions[i+1].x,positions[i+1].y);context.stroke();}
  });
}
scene.addEventListener('pointermove', e => {
  const r=scene.getBoundingClientRect();pointer={x:e.clientX-r.left,y:e.clientY-r.top};
  if (!reduced && e.pointerType==='mouse') $('.sculpture').style.translate = `${(pointer.x/width-.5)*16}px ${(pointer.y/height-.5)*12}px`;
});
scene.addEventListener('pointerleave', () => {pointer={x:-1000,y:-1000};$('.sculpture').style.translate='0px 0px';});
scene.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPlaying(false); elapsed = 0; setStage((stage + 1) % 3); }
});
scene.addEventListener('click', e => {
  setPlaying(false); elapsed = 0; setStage((stage + 1) % 3);
  if(reduced)return;
  const r=scene.getBoundingClientRect();const ripple=document.createElement('i');ripple.className='ripple';ripple.style.left=`${e.clientX-r.left}px`;ripple.style.top=`${e.clientY-r.top}px`;scene.append(ripple);setTimeout(()=>ripple.remove(),1050);
});
new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;lastTime=0;}).observe(engine);
document.addEventListener('visibilitychange',()=>{lastTime=0;});
function tick(now) {
  const delta=lastTime ? Math.min(now-lastTime,100) : 0;lastTime=now;
  if(visible && !document.hidden) {
    if(!reduced)draw(now);
    if(playing) {
      elapsed += delta;
      $('#film-progress').style.width=`${(stage+elapsed/duration)/3*100}%`;
      if(elapsed>=duration) {elapsed=0;if(stage<2){setStage(stage+1);if(reduced)draw(now);}else{setPlaying(false);$('#film-progress').style.width='100%';}}
    }
  }
  requestAnimationFrame(tick);
}
applyMotion();requestAnimationFrame(tick);
const escape = value => String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const selected=['moneyfest','buddy','davina'].map(id=>catalog.find(p=>p.id===id));
$('#project-grid').innerHTML=selected.map((p,i)=>`<article class="project-card"><button data-project="${p.id}" aria-label="Explore ${escape(p.name)}"><span class="project-art ${p.id}"><small>0${i+1} / PROJECT EXPLORATION</small><i class="art-orbit" aria-hidden="true"></i><strong>${escape(p.name)}</strong></span><h3>${escape(p.name)} ↗</h3></button><span class="project-type">${escape(p.category)}</span><p>${escape(p.description)}</p></article>`).join('');
const dialog=$('#project-dialog');let origin;
document.querySelectorAll('[data-project]').forEach(button=>button.addEventListener('click',()=>{
  const p=selected.find(p=>p.id===button.dataset.project);origin=button;
  $('#project-detail').innerHTML=`<p class="eyebrow">${escape(p.category)}</p><h2 id="project-title">${escape(p.name)}</h2><p>${escape(p.description)}</p><div class="dialog-tags">${p.stack.map(escape).join(' · ')}</div><h3>${escape(p.question)}</h3><p>${escape(p.detail)}</p><p class="project-status">${escape(p.status)}</p><a href="${escape(repoUrl(p))}" target="_blank" rel="noopener noreferrer">Explore the source ↗</a>`;
  dialog.showModal();document.body.style.overflow='hidden';
}));
$('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{document.body.style.overflow='';origin?.focus({preventScroll:true});});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
