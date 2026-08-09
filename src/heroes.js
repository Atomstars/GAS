/* THE HEROES — the thing you are looking at.

   This is what the old build was missing. It showed statements about the work; the
   reference sites it was measured against always have the SUBJECT on screen, lit and
   filling the frame, with the copy alongside as annotation. So every chapter of every
   project renders a hero: the ticket, the network boundary, the architecture, the
   agent's own output, the numbers.

   These are drawn in markup rather than loaded as images, on purpose:
     · they are crisp at any resolution and cost no network
     · they carry real content from data/work.js, so they cannot go stale
     · each is one function, so swapping in a real screenshot later is replacing a
       single return value with an <img>, not rebuilding a layout

   Nothing here fabricates a result. The terminal shows a plausible agent session, and
   it is labelled as an illustration; the metrics render whatever the data says,
   including [FILL], visibly. */

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
));

/** A browser/app window chrome that any hero can sit inside. */
const chrome = (title, body, { tone = '' } = {}) => `
  <div class="scr ${tone}">
    <div class="scr-bar">
      <i></i><i></i><i></i>
      <span class="scr-title">${esc(title)}</span>
    </div>
    <div class="scr-body">${body}</div>
  </div>`;

const HEROES = {
  /* A defect as it actually arrives: an ID, a trace, and nothing that tells you
     where to look. The hero IS the problem statement. */
  ticket: () => chrome('Jira — INC-4471', `
    <div class="tkt">
      <div class="tkt-head">
        <span class="tag sev">SEV-2</span>
        <span class="tag">policy-service</span>
        <span class="tkt-id">INC-4471</span>
      </div>
      <p class="tkt-sum">NullPointerException on renewal quote — intermittent</p>
      <pre class="trace" data-anim="print">java.lang.NullPointerException
  at com.<span class="dim">…</span>.RenewalQuoteService.applyEndorsement(RenewalQuoteService.java:214)
  at com.<span class="dim">…</span>.QuoteOrchestrator.orchestrate(QuoteOrchestrator.java:88)
  at com.<span class="dim">…</span>.QuoteController.renew(QuoteController.java:57)
  <span class="dim">… 41 frames omitted</span></pre>
      <div class="tkt-foot">
        <span>Reported by <b>ops</b></span><span>No reproduction steps</span><span>No linked change</span>
      </div>
    </div>`),

  /* The constraint drawn as what it is: a wall, with everything the agent may reach
     on the inside of it and everything it may not on the outside. */
  boundary: () => `
    <div class="bnd" data-anim="wall">
      <div class="bnd-in">
        <span class="bnd-label">INSIDE THE NETWORK</span>
        <ul>
          <li>Jira</li><li>GitLab</li><li>Wiki</li><li>PostgreSQL</li><li>Kibana</li>
          <li class="agent">Agent runtime</li>
        </ul>
      </div>
      <div class="bnd-wall" aria-hidden="true"><span>NO EGRESS</span></div>
      <div class="bnd-out">
        <span class="bnd-label">OUTSIDE</span>
        <ul class="denied">
          <li>Hosted agent platforms</li>
          <li>Third-party model APIs</li>
          <li>Any log or ticket text</li>
        </ul>
      </div>
    </div>`,

  /* Architecture, as a diagram rather than a paragraph about a diagram. */
  architecture: (ch, p) => `
    <div class="arch" data-anim="wire" role="img" aria-label="Architecture diagram for ${esc(p.name)}">
      <div class="arch-row">
        ${p.stack.slice(0, 3).map((s) => `<span class="node">${esc(s)}</span>`).join('<i class="wire"></i>')}
      </div>
      <div class="arch-spine" aria-hidden="true"></div>
      <div class="arch-row">
        ${p.stack.slice(3).map((s) => `<span class="node ghost">${esc(s)}</span>`).join('<i class="wire"></i>')
          || '<span class="node ghost">deterministic layer</span>'}
      </div>
      <p class="arch-cap">${esc(ch.head)}</p>
    </div>`,

  /* The agent's own output. Labelled an illustration, because it is one. */
  terminal: (ch, p) => chrome(`${p.id} — agent session`, `
    <pre class="term" data-anim="type"><span class="ok">▸</span> read ticket <span class="acc">INC-4471</span>
<span class="ok">▸</span> query kibana  <span class="dim">service=policy-service window=24h level=ERROR</span>
  <span class="dim">→ 37 matching entries, 2 distinct signatures</span>
<span class="ok">▸</span> trace path    <span class="dim">RenewalQuoteService.applyEndorsement:214</span>
<span class="ok">▸</span> search wiki   <span class="dim">"endorsement null renewal"</span>
  <span class="dim">→ 1 page, last edited 2024-11</span>
<span class="ok">▸</span> draft change  <span class="dim">branch fix/INC-4471</span>
<span class="warn">▸</span> <b>awaiting human review — no merge authority</b></pre>
    <p class="term-note">Illustration of the pipeline's shape. Not a capture from the client environment.</p>`,
  { tone: 'dark' }),

  /* Numbers, including the ones that are not verified yet. */
  metrics: (ch) => `
    <div class="mtx">
      ${(ch.metrics || []).map((m) => `
        <div class="mtx-cell${m.verified ? '' : ' unverified'}">
          <span class="mtx-val"${m.verified ? ' data-anim="count"' : ''}>${esc(m.value)}</span>
          <span class="mtx-lab">${esc(m.label)}</span>
          ${m.verified ? '' : '<span class="mtx-flag">not yet verified</span>'}
        </div>`).join('')}
    </div>`,

  /* A passage with its structure exposed — the thing the engine indexes. */
  passage: () => chrome('critical reasoning — record', `
    <div class="psg">
      <p><span class="an prem">PREMISE</span> The airline reduced fares on its regional routes by 12%.</p>
      <p><span class="an prem">PREMISE</span> Total revenue on those routes rose the following quarter.</p>
      <p><span class="an conc">CONCLUSION</span> Therefore the fare reduction increased demand.</p>
      <p class="psg-gap"><span class="an gap">ASSUMPTION</span> No other factor drove the volume increase.</p>
      <div class="psg-meta"><span>type: assumption</span><span>difficulty: 700</span><span>figure: none</span></div>
    </div>`),

  /* Extraction, and the thing that goes wrong with it. */
  parse: () => `
    <div class="prs">
      <div class="prs-col">
        <span class="prs-label">SOURCE PDF</span>
        <div class="prs-page">
          <span class="ln"></span><span class="ln"></span><span class="ln short"></span>
          <div class="fig" aria-hidden="true"><svg viewBox="0 0 100 60"><path d="M10 50 L50 10 L90 50 Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M50 10 L50 50" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3"/></svg></div>
          <span class="ln"></span><span class="ln short"></span>
        </div>
      </div>
      <div class="prs-arrow" aria-hidden="true">→</div>
      <div class="prs-col">
        <span class="prs-label">RECORD</span>
        <pre class="prs-json">{
  "stem": "In triangle ABC…",
  "figure": <span class="acc">"fig_0421.png"</span>,
  "caption": <span class="acc">"isosceles triangle,
     altitude from apex"</span>,
  "type": "geometry",
  "answer_key": "C"
}</pre>
      </div>
    </div>`,

  /* An operations surface, dense on purpose. */
  dashboard: () => chrome('Davina — mission surface', `
    <div class="dash">
      <div class="dash-main">
        <div class="dash-plot" data-anim="draw" aria-hidden="true">
          <svg viewBox="0 0 300 90" preserveAspectRatio="none">
            <polyline points="0,70 30,62 60,66 90,44 120,50 150,28 180,34 210,20 240,26 270,14 300,18"
                      fill="none" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </div>
        <div class="dash-strip">
          <span>ALT <b>412 km</b></span><span>VEL <b>7.66 km/s</b></span>
          <span>INC <b>51.6°</b></span><span>LINK <b>NOMINAL</b></span>
        </div>
      </div>
      <ul class="dash-side">
        <li><i class="dot ok"></i>power</li>
        <li><i class="dot ok"></i>thermal</li>
        <li><i class="dot warn"></i>comms</li>
        <li><i class="dot ok"></i>attitude</li>
      </ul>
    </div>`),

  /* The design problem itself: what earns permanent space. */
  layout: () => `
    <div class="lay">
      <div class="lay-box keep"><span>always</span><b>telemetry</b></div>
      <div class="lay-box keep"><span>always</span><b>link state</b></div>
      <div class="lay-box drop"><span>on change</span><b>subsystem detail</b></div>
      <div class="lay-box drop"><span>on change</span><b>event log</b></div>
      <div class="lay-box drop"><span>on demand</span><b>historical plots</b></div>
      <p class="lay-cap">Permanent space is the scarcest thing in an operational interface.</p>
    </div>`,

  /* A written note, for the chapter that has no picture to show. */
  note: (ch) => `
    <blockquote class="note">
      <p>${esc(ch.head)}</p>
      <cite>the honest answer, not an omission</cite>
    </blockquote>`,
};

/** Render the hero for a chapter. Unknown kinds degrade to the note card. */
export function hero(chapter, project) {
  const fn = HEROES[chapter.hero?.kind] || HEROES.note;
  return fn(chapter, project);
}
