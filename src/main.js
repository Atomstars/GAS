import './style.css';
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

// Each project has its own graphic language; all non-capture visuals are labelled studies.
function art(p){
  if(p.image)return `<div class="project-art capture-art"><span>PRODUCT CAPTURE</span><img src="${p.image}" alt="${p.id==='gmat'?'GMAT Trainer entry screen':'Daymark daily timeline'}" width="1440" height="1000" loading="lazy"></div>`;
  if(p.id==='davina')return '<div class="project-art davina-art"><div class="aero-rings"></div><span class="aero-word">DAVINA</span><span class="art-label">AEROSPACE / DIGITAL EXPERIENCE</span><span class="art-caption">DESIGN STUDY</span></div>';
  if(p.theme==='market')return `<div class="project-art market-art"><span class="art-label">PRICE IS ONLY HALF THE STORY.</span><svg viewBox="0 0 500 200" aria-hidden="true"><path class="chart-grid" d="M0 40H500M0 100H500M0 160H500M70 0V200M170 0V200M270 0V200M370 0V200M470 0V200"/><path class="chart-line" d="M0 155L40 143L65 155L100 115L130 128L168 83L202 109L240 78L270 91L306 40L340 66L379 20L418 47L451 27L500 34"/></svg><div class="evidence-chip">01 / THE MOVE</div><div class="evidence-chip second">02 / THE EVIDENCE</div><span class="art-caption">ILLUSTRATIVE STUDY / NOT LIVE MARKET DATA</span></div>`;
  if(p.id==='buddy')return '<div class="project-art buddy-art"><span class="art-label">A LITTLE MORE CLARITY.</span><div class="budget-ring"><span>buddy<small>SPEND · PLAN · UNDERSTAND</small></span></div><span class="art-caption">PRODUCT CONCEPT / PERSONAL FINANCE</span></div>';
  return `<div class="project-art system-art"><span class="art-label">${escape(p.name.toUpperCase())}</span><div class="system-path">${p.pipeline.map((s,i)=>`<div><b>${number(i+1)}</b><span>${escape(s)}</span></div>`).join('<i>↘</i>')}</div><span class="art-caption">SYSTEM STUDY</span></div>`;
}
$('#project-track').innerHTML=featured.map((p,i)=>`<article class="project-card" id="project-${p.id}" data-project="${p.id}" style="--project-color:${p.color}"><div class="project-card-top"><span>${number(i+1)} / ${escape(p.category)}</span><span>↗</span></div>${art(p)}<div class="project-card-info"><div><h3>${escape(p.name)}</h3><p>${escape(p.description)}</p></div><button class="build-link" data-build="${p.id}">Inside the build <span>↓</span></button></div><div class="project-tech">${p.stack.map(s=>`<span>${escape(s)}</span>`).join('')}</div></article>`).join('');
$('#case-select').innerHTML=catalog.map(p=>`<option value="${p.id}">${escape(p.name)}</option>`).join('');
$('#archive-list').innerHTML=catalog.map((p,i)=>`<div class="archive-row"><span>${number(i+1)}</span><button data-build="${p.id}"><h3>${escape(p.name)}</h3><small>${escape(p.status)}</small></button><span>${escape(p.type)}</span>${external(repoUrl(p),'Source')}</div>`).join('');
let caseMotion=null;
function animateCase(){
  caseMotion?.revert();caseMotion=null;
  if(!reduced.matches)caseMotion=gsap.context(()=>gsap.utils.toArray('.case-step').forEach(el=>gsap.from(el,{y:50,opacity:.3,scrollTrigger:{trigger:el,start:'top 90%',end:'top 50%',scrub:.6}})));
}
function selectCase(id,scroll=false){
  const p=catalog.find(p=>p.id===id);if(!p)return;
  caseMotion?.revert();caseMotion=null;
  $('#case-select').value=id;$('#case-source').href=repoUrl(p);
  $('#case-story').innerHTML=`<article class="case-step"><span class="eyebrow">01 / THE QUESTION · ${escape(p.name.toUpperCase())}</span><h3>${escape(p.question)}</h3><p>${escape(p.description)}</p></article><article class="case-step"><span class="eyebrow">02 / THE APPROACH</span><h3>${escape(p.title.join(' '))}</h3><p>${escape(p.answer)}</p><div class="case-pipeline">${p.pipeline.map((s,i)=>`<div><span>${number(i+1)}</span><strong>${escape(s)}</strong></div>`).join('')}</div></article><article class="case-step"><span class="eyebrow">03 / THE ENGINEERING</span><h3>Under the surface.</h3><p>${escape(p.detail)}</p><div class="case-tech">${p.stack.map(s=>`<span>${escape(s)}</span>`).join('')}</div><div class="case-links">${external(repoUrl(p),'Explore repository')}${p.url?external(p.url,'Open preview'):''}</div><small class="case-status">${escape(p.status)}</small></article>`;
  requestAnimationFrame(()=>{animateCase();ScrollTrigger.refresh();if(scroll)scrollToElement('#inside');});
}
selectCase('davina');
$('#case-select').addEventListener('change',e=>selectCase(e.target.value));
document.addEventListener('click',e=>{const build=e.target.closest('button[data-build]');if(build){$('#project-index').close();selectCase(build.dataset.build,true);}});
let railTween=null,railTrigger=null,currentProject=0;
const track=$('#project-track'),windowEl=$('.work-window');
const maxTravel=()=>Math.max(0,track.scrollWidth-windowEl.clientWidth);
const cardOffset=index=>track.children[index].offsetLeft-track.children[0].offsetLeft;
function updateProject(progress){
  const offset=progress*maxTravel();
  currentProject=featured.reduce((best,p,i)=>Math.abs(cardOffset(i)-offset)<Math.abs(cardOffset(best)-offset)?i:best,0);
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
$('#work-prev').addEventListener('click',()=>goProject(currentProject-1));$('#work-next').addEventListener('click',()=>goProject(currentProject+1));
windowEl.addEventListener('scroll',()=>{if(!railTrigger)updateProject(windowEl.scrollLeft/maxTravel()||0);},{passive:true});
// Keyboard focus must bring a horizontal card into view, including while pinned.
track.addEventListener('focusin',e=>{const card=e.target.closest('.project-card');if(card)goProject([...track.children].indexOf(card));});

const media=gsap.matchMedia();
media.add({motion:'(prefers-reduced-motion: no-preference)',desktop:'(min-width: 801px)'},ctx=>{
  const {motion,desktop}=ctx.conditions;
  $('.work-direction>span').textContent=motion&&desktop?'SCROLL DOWN. THE STORY MOVES SIDEWAYS.':'SWIPE OR USE THE ARROWS TO EXPLORE.';
  if(motion){
    document.body.classList.add('motion-enabled');
    const opening=gsap.timeline({scrollTrigger:{trigger:'.opening',start:'top top',end:()=>`+=${innerHeight*(desktop?1.65:1.15)}`,pin:'.opening-frame',scrub:.65,invalidateOnRefresh:true}});
    opening.to('.hero-image',{scale:2.2,xPercent:-19,yPercent:9,ease:'none',duration:1.8},0)
      .to('.hero-copy',{yPercent:-80,opacity:0,filter:'blur(5px)',duration:.7},0)
      .to('.hero-bottom, .opening-meta',{opacity:0,y:-35,duration:.4},0)
      .to('.hero-shade',{opacity:.8,duration:1.3},.3)
      .fromTo('.opening-story',{y:100,opacity:0},{y:0,opacity:1,duration:.6},.7)
      .fromTo('.story-line',{scaleY:0},{scaleY:1,duration:.6},1.05)
      .to('.opening-story',{y:-70,opacity:0,duration:.45},1.55);
    gsap.fromTo('.threshold-copy',{y:90,opacity:.25},{y:0,opacity:1,scrollTrigger:{trigger:'.threshold',start:'top 85%',end:'top 25%',scrub:1}});
    gsap.utils.toArray('.floating-labels span').forEach((el,i)=>gsap.fromTo(el,{y:100+i*30,rotation:(i%2?1:-1)*12},{y:-70-i*15,rotation:(i%2?-1:1)*4,ease:'none',scrollTrigger:{trigger:'.threshold',start:'top bottom',end:'bottom top',scrub:1}}));
    gsap.from('.about h2 span',{yPercent:90,rotation:3,opacity:0,stagger:.2,scrollTrigger:{trigger:'.about',start:'top 70%',end:'top 15%',scrub:1}});
    gsap.fromTo('.contact-image',{yPercent:-15,scale:1.2},{yPercent:10,scale:1,ease:'none',scrollTrigger:{trigger:'.contact',start:'top bottom',end:'bottom bottom',scrub:1}});
    gsap.from('.contact-content',{y:80,opacity:.2,scrollTrigger:{trigger:'.contact',start:'top 65%',end:'top 15%',scrub:1}});
  }
  if(motion&&desktop){
    document.body.classList.add('horizontal-cinema');
    railTween=gsap.to(track,{x:()=>-maxTravel(),ease:'none',scrollTrigger:{trigger:'.work',start:'top top',end:()=>`+=${maxTravel()}`,pin:'.work-frame',scrub:.6,invalidateOnRefresh:true,onUpdate:self=>updateProject(self.progress)}});
    railTrigger=railTween.scrollTrigger;
    [...track.children].forEach(card=>gsap.fromTo(card.querySelector('.project-art'),{scale:.88,rotationY:-7},{scale:1,rotationY:0,scrollTrigger:{trigger:card,containerAnimation:railTween,start:'left 95%',end:'left 20%',scrub:true}}));
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

// Ambient particles and pointer light are decorative and sleep offscreen.
const canvas=$('#dust'),paint=canvas.getContext('2d');let dustFrame=0,dustVisible=true,dustTime=0;
const particles=Array.from({length:38},(_,i)=>({x:(Math.sin(i*37.7)*.5+.5),y:(Math.cos(i*14.3)*.5+.5),r:.3+(i%4)*.2}));
function sizeDust(){canvas.width=innerWidth;canvas.height=innerHeight;}
function drawDust(){dustFrame=0;if(!dustVisible||document.hidden||reduced.matches)return;dustTime+=.001;paint.clearRect(0,0,canvas.width,canvas.height);for(const p of particles){paint.fillStyle=`rgba(249,216,165,${.12+p.r*.2})`;paint.beginPath();paint.arc((p.x+Math.sin(dustTime+p.y)*.015)*canvas.width,((p.y-dustTime*.045+10)%1)*canvas.height,p.r,0,Math.PI*2);paint.fill();}dustFrame=requestAnimationFrame(drawDust);}
function resumeDust(){if(!dustFrame&&dustVisible&&!reduced.matches&&!document.hidden)dustFrame=requestAnimationFrame(drawDust);}
sizeDust();addEventListener('resize',sizeDust);new IntersectionObserver(([entry])=>{dustVisible=entry.isIntersecting;if(dustVisible)resumeDust();else{cancelAnimationFrame(dustFrame);dustFrame=0;}}).observe($('.opening'));document.addEventListener('visibilitychange',resumeDust);reduced.addEventListener('change',()=>{paint.clearRect(0,0,canvas.width,canvas.height);resumeDust();});
$('.opening-frame').addEventListener('pointermove',e=>{if(reduced.matches||e.pointerType!=='mouse')return;gsap.to('.light-haze',{x:(e.clientX/innerWidth-.5)*30,y:(e.clientY/innerHeight-.5)*20,duration:1.3,overwrite:true});},{passive:true});
$('.opening-frame').addEventListener('pointerdown',e=>{if(reduced.matches||e.target.closest('a,button'))return;gsap.fromTo('.light-haze',{opacity:.2},{opacity:.65,duration:.65,yoyo:true,repeat:1});});

const loader=$('#loader');let entered=false;
function enter(){if(entered)return;entered=true;loader.hidden=true;try{sessionStorage.setItem('gas-aperture-seen','yes');}catch{}if(!reduced.matches)gsap.from('.hero-copy h1,.hero-description,.hero-bottom',{y:30,opacity:0,duration:1.15,stagger:.12,clearProps:'all'});}
let seen=false;try{seen=sessionStorage.getItem('gas-aperture-seen')==='yes';}catch{}
if(!seen&&!reduced.matches)loader.hidden=false;
$('#skip-loading').addEventListener('click',enter);
const safety=setTimeout(enter,3500);
Promise.allSettled([$('#hero-image').decode(),document.fonts.ready]).then(()=>{clearTimeout(safety);$('#load-label').textContent='THE FIRST FRAME IS READY';if(!loader.hidden)gsap.to(loader,{opacity:0,duration:.5,onComplete:enter});else enter();ScrollTrigger.refresh();if(location.hash&&$(location.hash))scrollToElement(location.hash);});
