const systems={
 gmat:{name:'GMAT / LOCAL AI TUTOR',project:'gmat-system',steps:[
  ['Ask a question','React + TypeScript','A learner opens a practice question and asks the tutor for help. The interface sends the question ID, message, and conversation history to the API.',['React','TypeScript']],
  ['Receive the request','FastAPI','The /tutor/chat endpoint accepts the structured request and opens a connection to the local question database.',['FastAPI','Pydantic']],
  ['Retrieve context','SQLite','The service loads the question, correct answer, and official explanation. This is the context supplied to the tutor, so the response can relate to the actual exercise.',['SQLite','SQL']],
  ['Run local inference','Ollama','Python assembles the context and chat history, then calls a local Ollama model. The implementation tries a smaller fallback model when the first model is unavailable.',['Ollama','Python','HTTPX']],
  ['Return the explanation','API → interface','The API returns the tutor reply to the practice interface. Connection failures produce explicit service errors rather than a fabricated answer.',['JSON response','Error handling']]
 ]},
 buddy:{name:'BUDDY / CONTEXTUAL INTELLIGENCE',project:'buddy',steps:[
  ['Reflect on the day','React','The user brings together their tasks, spending, and journal. These signals provide the context for a daily reflection.',['React','JavaScript']],
  ['Connect the service','Node.js + Express','The backend connects the application to its assistant services. Model access stays behind the server-side provider module.',['Node.js','Express']],
  ['Assemble the context','Buddy Brain','The review service combines completed tasks, expenses, mood, and journal content into a structured prompt. It asks for specific observations from that day.',['Context assembly','Prompt design']],
  ['Generate or fall back','Groq + heuristics','With a key available, the provider requests structured JSON from Groq. Missing keys or failed calls use a deterministic reflection fallback.',['Groq','JSON output','Fallback logic']],
  ['Show useful reflection','Structured response','The returned result contains a summary, wins, improvements, a cross-domain connection, and a focus for tomorrow. The engine field records whether AI or heuristics produced it.',['Typed shape','React interface']]
 ]},
 moneyfest:{name:'MONEYFEST / EVIDENCE & VERIFICATION',project:'moneyfest',steps:[
  ['Collect the evidence','Python ingestion','Market prices, company filings, and news enter the data pipeline. Evidence is associated with the relevant company and its recorded exposures.',['Python','SQLite']],
  ['Check the movement','Deterministic gate','A quantitative gate separates ordinary market movement from events worth investigating. Ordinary movement does not need an attribution model call.',['Versioned rules','Statistical checks']],
  ['Propose an explanation','Groq / Anthropic','For eligible events, an attribution model receives a frozen evidence bundle and proposes candidate drivers through structured tool calls.',['Groq','Anthropic','Tool calling']],
  ['Test the claims','Rules + verifier','Deterministic checks reject unsupported claims. Surviving candidates are passed to a second model for entailment verification. Rejected claims are logged.',['Deterministic validation','LLM verifier']],
  ['Cite or abstain','Confidence + evidence','Verified drivers are scored and rendered with evidence citations. If none survive, the system returns NO_DRIVER: there is no clear explanation supported by the evidence.',['Citations','Confidence rubric','Abstention']]
 ]}
};
export function createSystemExplorer({motionEnabled,onScene}){
 const $=s=>document.querySelector(s);let selected='gmat',active=0,playing=false,timer=null,scene=null,visible=false;
 function cancel(){clearTimeout(timer);timer=null;}
 function schedule(){cancel();if(playing&&visible&&!document.hidden&&motionEnabled())timer=setTimeout(()=>{if(active===4){playing=false;update();}else{active++;update();schedule();}},1900);}
 function update(){const model=systems[selected],step=model.steps[active];document.querySelectorAll('[data-node]').forEach((b,i)=>{b.setAttribute('aria-pressed',String(i===active));b.classList.toggle('completed',i<active);});$('#flow-step-label').textContent=`STEP ${String(active+1).padStart(2,'0')} / ${active===0?'THE REQUEST':active===4?'THE RESPONSE':'INSIDE THE SYSTEM'}`;$('#flow-title').textContent=step[0];$('#flow-description').textContent=step[2];$('#flow-tools').innerHTML=step[3].map(t=>`<span>${t}</span>`).join('');$('#flow-progress').textContent=`0${active+1} / 05`;$('#flow-prev').disabled=active===0;$('#flow-next').disabled=active===4;$('#flow-play').innerHTML=!motionEnabled()?(active===4?'Restart flow <span>↻</span>':'Next stage <span>→</span>'):playing?'Pause request <span>Ⅱ</span>':active===4?'Replay request <span>↻</span>':'Play request <span>▷</span>';$('#flow-play').setAttribute('aria-pressed',String(playing));scene?.setActive(active);}
 function select(id){cancel();playing=false;selected=id;active=0;const model=systems[id];$('#system-name').textContent=model.name;$('#flow-source').dataset.project=model.project;document.querySelectorAll('[data-system]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.system===id)));$('#system-nodes').innerHTML=model.steps.map((s,i)=>`<button class="system-node" data-node="${i}" aria-pressed="false"><small>0${i+1} / ${i===0?'INPUT':i===4?'OUTPUT':'PROCESS'}</small><b>${s[0]}</b><span>${s[1]}</span></button>`).join('');update();}
 document.querySelectorAll('[data-system]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.system)));
 $('#system-nodes').addEventListener('click',e=>{const node=e.target.closest('[data-node]');if(!node)return;playing=false;cancel();active=Number(node.dataset.node);update();});
 $('#flow-prev').addEventListener('click',()=>{playing=false;cancel();active=Math.max(0,active-1);update();});$('#flow-next').addEventListener('click',()=>{playing=false;cancel();active=Math.min(4,active+1);update();});
 $('#flow-play').addEventListener('click',()=>{if(!motionEnabled()){active=active===4?0:active+1;playing=false;update();return;}playing=!playing;if(playing&&active===4)active=0;update();schedule();});
 new IntersectionObserver(([e])=>{visible=e.isIntersecting;schedule();},{threshold:.15}).observe($('.system-theater'));document.addEventListener('visibilitychange',schedule);
 select('gmat');
 import('./visual/StudioSculpture.js').then(({createSculpture})=>{scene=createSculpture($('#system-canvas'),motionEnabled(),{mode:'system'});scene.setActive(active);onScene(scene);}).catch(()=>{});
 return {setMotion(value){scene?.setMotion(value);if(!value){playing=false;cancel();update();}else schedule();}};
}
