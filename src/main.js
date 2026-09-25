import './style.css';
import './galaxy.css';
import './matter.css';
import { createInteractionInk } from './visual/InteractionInk.js';
import { createMatterField } from './visual/MatterField.js';
import { createGalaxy } from './visual/Galaxy.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { catalog, repoUrl } from './data/catalog.js';
gsap.registerPlugin(ScrollTrigger);
const $=s=>document.querySelector(s);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const featured=catalog.filter(p=>!['first-code','hcl','prince'].includes(p.id));
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>String(n).padStart(2,'0');
const external=(url,label)=>`<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;

// Each world uses a visual metaphor for its software domain.
const worlds={davina:['Atmosphere','Flight · research · digital presence','orbit'],moneyfest:['The evidence belt','Signals · context · attribution','market'],buddy:['A balanced orbit','Spending · budgets · daily life','rings'],daymark:['The day cycle','Intention · time · reflection','clock'],gmat:['The knowledge sphere','Practice · extraction · progress','grid'],cafe:['The flow station','Orders · processing · automation','station'],'job-agent':['The signal network','Profile · search · next steps','satellite'],tutor:['The learning constellation','Code · guidance · understanding','grid'],housing:['The inhabited world','Properties · patterns · predictions','terrain'],'gmat-system':['The local intelligence','Documents · practice · local AI','rings'],gas:['The origin','Ideas · engineering · experience','orbit']};
const chamberField=createMatterField($('#chamber-field'),{reduced,kind:'chamber'});
const worldField=createMatterField($('#world-field'),{reduced,kind:'world'});
const anatomyField=createMatterField($('#anatomy-field'),{reduced,kind:'anatomy'});
document.querySelectorAll('[data-matter]').forEach(button=>button.addEventListener('click',()=>{
  chamberField.setMode(button.dataset.matter);
  document.querySelectorAll('[data-matter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  $('#matter-state').textContent={bond:'BONDED / CONNECTIONS FORMING',gas:'DISPERSED / FREE TO EXPLORE',orbit:'ORBITING / FINDING A RHYTHM'}[button.dataset.matter];
}));
$('#project-dock').innerHTML=featured.map((p,i)=>`<button data-orbit="${i}" aria-label="Show ${escape(p.name)}" aria-pressed="${i===0}" style="--project-color:${p.color}"><span>${number(i+1)}</span><i></i><strong>${escape(p.name)}</strong></button>`).join('');
$('#project-track').innerHTML=featured.map((p,i)=>`<article class="project-card" id="project-${p.id}" data-project="${p.id}" style="--project-color:${p.color}"><div class="project-card-top"><span>SPECIMEN ${number(i+1)} / ${escape(p.category)}</span><span>CONCEPTUAL SYSTEM MODEL</span></div><div class="project-card-info"><div><span class="project-kicker">${escape(worlds[p.id][0].toUpperCase())}</span><h3>${escape(p.name)}</h3><p>${escape(p.description)}</p><div class="project-tech">${p.stack.map(s=>`<span>${escape(s)}</span>`).join('')}</div><button class="build-link" data-build="${p.id}">Explore the anatomy <span>↗</span></button></div></div><button class="world-art" data-build="${p.id}" aria-label="Explore ${escape(p.name)}"><span class="world-crosshair" aria-hidden="true"></span><span class="world-hint">DRAG TO ROTATE / TAP TO ENTER ↗</span></button><div class="project-signal"><span>INPUT → TRANSFORM → OUTPUT</span><ol>${p.pipeline.map(s=>`<li>${escape(s)}</li>`).join('')}</ol></div></article>`).join('');
$('#case-select').innerHTML=catalog.map(p=>`<option value="${p.id}">${escape(p.name)}</option>`).join('');
$('#archive-list').innerHTML=catalog.map((p,i)=>`<div class="archive-row"><span>${number(i+1)}</span><button data-build="${p.id}"><h3>${escape(p.name)}</h3><small>${escape(p.status)}</small></button><span>${escape(p.type)}</span>${external(repoUrl(p),'Source')}</div>`).join('');
let caseMotion=null;
function setLayer(index){anatomyField.setLayer(index);document.querySelectorAll('[data-layer]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.layer)===index)));}
function animateCase(){
  caseMotion?.revert();caseMotion=null;
  if(!reduced.matches)caseMotion=gsap.context(()=>gsap.utils.toArray('.case-step').forEach((el,i)=>{
    gsap.fromTo(el,{y:70,rotateX:4,opacity:.4},{y:0,rotateX:0,opacity:1,scrollTrigger:{trigger:el,start:'top 90%',end:'top 45%',scrub:.7}});
    ScrollTrigger.create({trigger:el,start:'top 60%',end:'bottom 60%',onEnter:()=>setLayer(i),onEnterBack:()=>setLayer(i)});
  }));
}
document.querySelectorAll('[data-layer]').forEach(button=>button.addEventListener('click',()=>{const i=Number(button.dataset.layer);setLayer(i);scrollToElement(`#case-step-${i}`);}));
function selectCase(id,scroll=false){
  const p=catalog.find(p=>p.id===id);if(!p)return;
  caseMotion?.revert();caseMotion=null;
  $('#case-select').value=id;$('#case-source').href=repoUrl(p);anatomyField.setProject(catalog.indexOf(p),p.color);setLayer(0);$('#inside').style.setProperty('--specimen-color',p.color);
  $('#case-story').innerHTML=`<article class="case-step" id="case-step-0"><span class="case-serial" aria-hidden="true">01</span><span class="eyebrow">01 / THE QUESTION · ${escape(p.name.toUpperCase())}</span><h3>${escape(p.question)}</h3><p>${escape(p.description)}</p></article><article class="case-step" id="case-step-1"><span class="case-serial" aria-hidden="true">02</span><span class="eyebrow">02 / THE APPROACH</span><h3>${escape(p.title.join(' '))}</h3><p>${escape(p.answer)}</p><div class="case-pipeline">${p.pipeline.map((s,i)=>`<div><span>${number(i+1)}</span><strong>${escape(s)}</strong></div>`).join('')}</div></article><article class="case-step" id="case-step-2"><span class="case-serial" aria-hidden="true">03</span><span class="eyebrow">03 / THE ENGINEERING</span><h3>Under the surface.</h3><p>${escape(p.detail)}</p><div class="case-tech">${p.stack.map(s=>`<span>${escape(s)}</span>`).join('')}</div><div class="case-links">${external(repoUrl(p),'Explore repository')}${p.url?external(p.url,'Open preview'):''}</div><small class="case-status">${escape(p.status)}</small>${p.image?`<figure class="case-capture"><img src="${p.image}" alt="${escape(p.name)} public interface capture" loading="lazy"><figcaption>PUBLIC INTERFACE CAPTURE</figcaption></figure>`:''}</article>`;
  requestAnimationFrame(()=>{animateCase();ScrollTrigger.refresh();if(scroll)scrollToElement('#inside');});
}
selectCase('davina');
createGalaxy($('#galaxy'),reduced);
createInteractionInk(reduced);
$('#case-select').addEventListener('change',e=>selectCase(e.target.value));
document.addEventListener('click',e=>{const build=e.target.closest('button[data-build]');if(build){$('#project-index').close();selectCase(build.dataset.build,true);}});
let railTween=null,railTrigger=null,currentProject=0,lastProject=-1;
const track=$('#project-track'),windowEl=$('.work-window');
const maxTravel=()=>Math.max(0,track.scrollWidth-windowEl.clientWidth);
const cardOffset=index=>track.children[index].offsetLeft-track.children[0].offsetLeft;
function updateProject(progress){
  const offset=progress*maxTravel();
  currentProject=featured.reduce((best,p,i)=>Math.abs(cardOffset(i)-offset)<Math.abs(cardOffset(best)-offset)?i:best,0);
  if(currentProject!==lastProject){lastProject=currentProject;worldField.setProject(currentProject,featured[currentProject].color);document.querySelectorAll('[data-orbit]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.orbit)===currentProject)));const active=$(`[data-orbit="${currentProject}"]`);$('#project-dock').scrollTo({left:active.offsetLeft-$('#project-dock').clientWidth/2+active.clientWidth/2,behavior:reduced.matches?'instant':'smooth'});}
  $('#work-current').textContent=`${number(currentProject+1)} / ${number(featured.length)}`;
  $('#work-prev').disabled=currentProject===0;$('#work-next').disabled=currentProject===featured.length-1;
  gsap.set('.work-progress i',{scaleX:(currentProject+1)/featured.length});
}
function scrollToElement(selector){const el=$(selector);if(!el)return;window.scrollTo({top:el.getBoundingClientRect().top+scrollY-85,behavior:reduced.matches?'instant':'smooth'});}
function goProject(index){
  index=Math.max(0,Math.min(featured.length-1,index));
  if(railTrigger){const progress=Math.min(1,cardOffset(index)/maxTravel());window.scrollTo({top:railTrigger.start+progress*(railTrigger.end-railTrigger.start),behavior:reduced.matches?'instant':'smooth'});}
  else windowEl.scrollTo({left:cardOffset(index),behavior:reduced.matches?'instant':'smooth'});
}
document.querySelectorAll('[data-orbit]').forEach(button=>button.addEventListener('click',()=>goProject(Number(button.dataset.orbit))));
$('#work-prev').addEventListener('click',()=>goProject(currentProject-1));$('#work-next').addEventListener('click',()=>goProject(currentProject+1));
windowEl.addEventListener('scroll',()=>{if(!railTrigger)updateProject(windowEl.scrollLeft/maxTravel()||0);},{passive:true});
// Keyboard focus must bring a horizontal card into view, including while pinned.
track.addEventListener('focusin',e=>{const card=e.target.closest('.project-card');if(card)goProject([...track.children].indexOf(card));});

const media=gsap.matchMedia();
media.add({motion:'(prefers-reduced-motion: no-preference)',desktop:'(min-width: 801px)'},ctx=>{
  const {motion,desktop}=ctx.conditions;
  $('.work-direction>span').textContent=motion&&desktop?'SCROLL TO TRAVEL · SELECT TO EXPLORE':'SWIPE OR USE THE ARROWS TO EXPLORE.';
  if(motion){
    document.body.classList.add('motion-enabled');
    const opening=gsap.timeline({scrollTrigger:{trigger:'.opening',start:'top top',end:()=>`+=${innerHeight*(desktop?1.65:1.15)}`,pin:'.opening-frame',scrub:.65,invalidateOnRefresh:true}});
    opening.to('.orbital-guide',{scale:1.6,opacity:0,ease:'none',duration:1.8},0)
      .to('.hero-copy',{yPercent:-80,opacity:0,filter:'blur(5px)',duration:.7},0)
      .to('.hero-bottom, .opening-meta',{opacity:0,y:-35,duration:.4},0)
      .to('.hero-shade',{opacity:.8,duration:1.3},.3)
      .fromTo('.opening-story',{y:100,opacity:0},{y:0,opacity:1,duration:.6},.7)
      .fromTo('.story-line',{scaleY:0},{scaleY:1,duration:.6},1.05)
      .to('.opening-story',{y:-70,opacity:0,duration:.45},1.55);
    const chamber=gsap.timeline({scrollTrigger:{trigger:'.threshold',start:'top top',end:()=>`+=${innerHeight*.85}`,pin:desktop?'.matter-frame':false,pinSpacing:true,scrub:.7,invalidateOnRefresh:true}});
    chamber.fromTo('.chamber-stage',{scale:.78,rotateZ:-12},{scale:1.1,rotateZ:8,duration:1},0)
      .fromTo('.chamber-copy',{y:25},{y:-25,duration:1},0)
      .fromTo('.reticle-two',{rotate:0},{rotate:95,duration:1},0)
      .fromTo('.chapter-number',{y:100,opacity:.1},{y:-60,opacity:.35,duration:1},0);
    gsap.from('.about h2 span',{yPercent:90,rotation:3,opacity:0,stagger:.2,scrollTrigger:{trigger:'.about',start:'top 70%',end:'top 15%',scrub:1}});
    gsap.fromTo('.contact-image',{yPercent:-15,scale:1.2},{yPercent:10,scale:1,ease:'none',scrollTrigger:{trigger:'.contact',start:'top bottom',end:'bottom bottom',scrub:1}});
    gsap.from('.contact-content',{y:80,opacity:.2,scrollTrigger:{trigger:'.contact',start:'top 65%',end:'top 15%',scrub:1}});
  }
  if(motion&&desktop){
    document.body.classList.add('horizontal-cinema');
    railTween=gsap.to(track,{x:()=>-maxTravel(),ease:'none',scrollTrigger:{trigger:'.work',start:'top top',end:()=>`+=${maxTravel()}`,pin:'.work-frame',scrub:.6,invalidateOnRefresh:true,onUpdate:self=>updateProject(self.progress)}});
    railTrigger=railTween.scrollTrigger;
    [...track.children].forEach(card=>gsap.fromTo(card.querySelector('.project-card-info'),{y:65,opacity:.4},{y:0,opacity:1,scrollTrigger:{trigger:card,containerAnimation:railTween,start:'left 95%',end:'left 20%',scrub:true}}));
  }else{$('.work-direction>span').textContent='SWIPE OR USE THE ARROWS TO EXPLORE.';}
  return()=>{railTrigger=null;railTween=null;document.body.classList.remove('motion-enabled','horizontal-cinema');};
});
updateProject(0);
reduced.addEventListener('change',()=>{animateCase();ScrollTrigger.refresh();});

// Only anchor navigation is enhanced. Wheel and touch scroll stay native.
document.addEventListener('click',e=>{const anchor=e.target.closest('a[href^="#"]');if(!anchor)return;const href=anchor.getAttribute('href');if(href.length<2)return;e.preventDefault();if(href==='#work'&&railTrigger)window.scrollTo({top:railTrigger.start,behavior:reduced.matches?'instant':'smooth'});else scrollToElement(href);history.pushState(null,'',href);});
addEventListener('popstate',()=>{if(location.hash)scrollToElement(location.hash);});
function renderIndex(query=''){
  const matches=catalog.filter(p=>`${p.name} ${p.repo} ${p.stack.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  $('#index-list').innerHTML=matches.length?matches.map(p=>`<button data-build="${p.id}" class="index-row"><span>${number(catalog.indexOf(p)+1)}</span><div><strong>${escape(p.name)}</strong><small>${escape(p.type)} · ${escape(p.status)}</small></div><span>↗</span></button>`).join(''):'<p class="no-results">No matching projects. Try another name or technology.</p>';
}
renderIndex();$('#open-index').hidden=false;$('#open-index').addEventListener('click',()=>{$('#project-index').showModal();$('#project-search').focus();});$('#close-index').addEventListener('click',()=>$('#project-index').close());$('#project-search').addEventListener('input',e=>renderIndex(e.target.value));
const header=$('.header');addEventListener('scroll',()=>header.classList.toggle('scrolled',scrollY>40),{passive:true});

// Pointer trails leave short-lived connected stars. Touch keeps native scrolling.
const canvas=$('#dust'),paint=canvas.getContext('2d');let trailFrame=0,trailVisible=true;
const trail=[];let dragging=false;
function sizeDust(){canvas.width=innerWidth;canvas.height=innerHeight;}
function drawTrail(){trailFrame=0;paint.clearRect(0,0,canvas.width,canvas.height);if(reduced.matches||document.hidden||!trailVisible)return;const now=performance.now();while(trail.length&&now-trail[0].time>1100)trail.shift();trail.forEach((p,i)=>{const alpha=1-(now-p.time)/1100;paint.fillStyle=`rgba(155,212,255,${alpha})`;paint.shadowColor='#7fbbff';paint.shadowBlur=12;paint.beginPath();paint.arc(p.x,p.y,p.drag?2.3:1,0,Math.PI*2);paint.fill();if(i&&p.drag){paint.strokeStyle=`rgba(154,190,255,${alpha*.5})`;paint.beginPath();paint.moveTo(trail[i-1].x,trail[i-1].y);paint.lineTo(p.x,p.y);paint.stroke();}});if(trail.length)trailFrame=requestAnimationFrame(drawTrail);}
sizeDust();addEventListener('resize',sizeDust);
$('.opening-frame').addEventListener('pointerdown',e=>{if(!e.target.closest('a,button'))dragging=true;});
addEventListener('pointerup',()=>dragging=false);addEventListener('pointercancel',()=>dragging=false);
$('.opening-frame').addEventListener('pointerleave',()=>dragging=false);
$('.opening-frame').addEventListener('pointermove',e=>{if(reduced.matches||!['mouse','touch','pen'].includes(e.pointerType))return;const rect=canvas.getBoundingClientRect();trail.push({x:e.clientX-rect.left,y:e.clientY-rect.top,time:performance.now(),drag:dragging});if(trail.length>90)trail.shift();if(!trailFrame)drawTrail();},{passive:true});
new IntersectionObserver(([e])=>{trailVisible=e.isIntersecting;if(!trailVisible){cancelAnimationFrame(trailFrame);trailFrame=0;trail.length=0;paint.clearRect(0,0,canvas.width,canvas.height);}}).observe($('.opening'));
reduced.addEventListener('change',()=>{trail.length=0;drawTrail();});

const loader=$('#loader');let entered=false;
function enter(){if(entered)return;entered=true;loader.hidden=true;try{sessionStorage.setItem('gas-galaxy-seen','yes');}catch{}if(!reduced.matches)gsap.from('.hero-copy h1,.hero-description,.hero-bottom',{y:30,opacity:0,duration:1.15,stagger:.12,clearProps:'all'});}
let seen=false;try{seen=sessionStorage.getItem('gas-galaxy-seen')==='yes';}catch{}
if(!seen&&!reduced.matches)loader.hidden=false;
$('#skip-loading').addEventListener('click',enter);
const safety=setTimeout(enter,3500);
Promise.allSettled([document.fonts.ready]).then(()=>{clearTimeout(safety);$('#load-label').textContent='YOUR UNIVERSE IS READY';if(!loader.hidden)gsap.to(loader,{opacity:0,duration:.5,onComplete:enter});else enter();ScrollTrigger.refresh();if(location.hash&&$(location.hash))scrollToElement(location.hash);});
