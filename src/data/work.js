/* THE WORK — the content of record.

   This replaces the old `projects.js`, which carried a one-line blurb and a repo link
   per project and nothing else. That is what "the main content is still not there"
   meant: the site had five acts of typography about what I do and almost nothing about
   what I actually built.

   Every project here carries the same five chapters — problem, constraint, build, AI,
   outcome — because the structure is what lets a reader compare three projects instead
   of reading three essays. The 3D film used to supply the variety; the content has to
   supply it now.

   RULES (GAS-REBUILD-BRIEF.md §4.3), enforced by review, not by code:
     · no sentence that could appear on any other portfolio
     · `stack` is technologies only — not "Systems Design", not "UX"
     · NEVER invent a number. Unverified figures are the string '[FILL]' and are listed
       in VERIFY.md. A false metric is the only unrecoverable error on this site.
     · every headline <= 6 words, every body 45-70 words — one screen's reading */

export const GITHUB_USER = 'Atomstars';
export const repoUrl = (repo) => `https://github.com/${GITHUB_USER}/${repo}`;

/** Marks a figure that has not been verified yet. Rendered as a visible placeholder. */
export const FILL = '[FILL]';

export const WORK = [
  {
    id: 'defect-pipeline',
    n: '01',
    name: 'Agentic Defect Pipeline',
    category: 'AI AGENTS / ENTERPRISE',
    year: '2025—26',
    accent: '#4ade80',
    claim: 'Takes a production defect from ticket to reviewed merge request.',
    role: 'Pipeline architecture · agent design · validation · deployment',
    stack: ['Java 17', 'Spring Boot', 'PostgreSQL', 'GitLab CI', 'MCP', 'Kibana'],
    links: {
      live: null,
      repo: null,
      caseStudy: null,
      liveNote: 'Runs inside a client network. Nothing from it can leave, so the architecture below is the evidence.',
    },
    chapters: [
      {
        n: '01',
        label: 'THE PROBLEM',
        head: 'Triage was the bottleneck',
        body: 'Production defects on a P&C insurance platform arrived as Jira tickets with a stack trace and little else. Before anyone could write a line of code an engineer spent hours reconstructing context: which service, which recent change, what the logs said, whether the wiki already documented it. The fix was usually small. Finding out what to fix was not.',
        hero: { kind: 'ticket' },
      },
      {
        n: '02',
        label: 'THE CONSTRAINT',
        head: 'Zero external egress',
        body: 'Banking environment. No code, no logs and no ticket text may leave the network, which rules out every hosted agent product on the market. Whatever context the agent needed had to be reached through internally-hosted connectors, and every artefact it produced had to survive the same human review as any other change.',
        hero: { kind: 'boundary' },
      },
      {
        n: '03',
        label: 'THE BUILD',
        head: 'Agents wired to the systems of record',
        body: 'Custom Copilot agents connected over MCP to Jira, GitLab, the internal wiki, Postgres and Kibana. The agent reads the ticket, pulls the relevant logs, traces the failing path through the repository, checks the wiki for known context, and drafts a change with a written rationale. Every connector is internal; nothing crosses the boundary.',
        hero: { kind: 'architecture' },
      },
      {
        n: '04',
        label: 'THE AI',
        head: 'The model assembles. It does not decide.',
        body: 'The interesting design question was never whether it could write the patch — it usually can. It was where to put the seam. Context assembly is exactly the work that is expensive for a human and cheap for a model with the right connectors. Judgement is the reverse. The pipeline is drawn on that line.',
        hero: { kind: 'terminal' },
        aside: {
          role: 'Context assembly, hypothesis, first-draft patch',
          guardrail: 'No agent output reaches a branch without a human-reviewed MR.',
          notModel: 'Merge authority, test sign-off and the decision that a fix is correct stay with the engineer. Deliberately.',
        },
      },
      {
        n: '05',
        label: 'THE OUTCOME',
        head: 'Merged to production',
        body: 'Agent-authored merge requests have been reviewed, approved and merged into production. My role moved from writing the change to directing, validating and shipping it — which is the actual claim this project makes, and the one worth interrogating.',
        hero: { kind: 'metrics' },
        metrics: [
          { label: 'Systems wired over MCP', value: '5', verified: true },
          { label: 'MRs approved and merged', value: FILL, verified: false },
          { label: 'Median triage time, before → after', value: FILL, verified: false },
        ],
      },
    ],
  },

  {
    id: 'gmat-engine',
    n: '02',
    name: 'GMAT Verbal Engine',
    category: 'RETRIEVAL / EDTECH',
    year: '2025',
    accent: '#60a5fa',
    claim: 'A retrieval engine for GMAT verbal, with a regression suite that keeps it honest.',
    role: 'Architecture · retrieval · parsing · evaluation',
    stack: ['Python', 'FastAPI', 'Qdrant', 'MiniLM', 'PostgreSQL'],
    links: {
      live: null,
      repo: 'gmat-verbal-practice',
      caseStudy: null,
      liveNote: null,
    },
    chapters: [
      {
        n: '01',
        label: 'THE PROBLEM',
        head: 'Question banks without the reasoning',
        body: 'Every GMAT verbal product I could find stored questions as flat text and graded the answer. None of them could tell you why a wrong option was wrong in the terms of the passage it came from, and none could find you another question that failed for the same reason. The content existed. The structure did not.',
        hero: { kind: 'passage' },
      },
      {
        n: '02',
        label: 'THE CONSTRAINT',
        head: 'The source material is not text',
        body: 'Official material arrives as PDFs, and a meaningful share of it is geometry figures, tables and charts rather than prose. Anything the parser dropped was invisible to retrieval forever — and silently so, because a question missing its diagram still looks like a valid record. Extraction had to be verified, not assumed.',
        hero: { kind: 'parse' },
      },
      {
        n: '03',
        label: 'THE BUILD',
        head: 'FastAPI, Qdrant, cosine retrieval',
        body: 'Questions are parsed into structured records, embedded with MiniLM and stored in Qdrant with their metadata. Retrieval is cosine similarity over that space, filtered by question type and difficulty. Figures are extracted per record and captioned so image content is searchable through the same text index as everything else.',
        hero: { kind: 'architecture' },
      },
      {
        n: '04',
        label: 'THE AI',
        head: 'Embeddings retrieve. Rules decide.',
        body: 'The model finds candidates; it does not judge correctness. Answer keys, question typing and difficulty come from the source, not from inference — a retrieval system that hallucinates an answer key is worse than no system, because it is confidently wrong at exactly the moment a student trusts it.',
        hero: { kind: 'terminal' },
        aside: {
          role: 'Semantic retrieval and figure captioning',
          guardrail: 'A 63-test regression suite runs against known query/expectation pairs on every change.',
          notModel: 'Answer keys, scoring and question classification are deterministic and sourced. No model writes them.',
        },
      },
      {
        n: '05',
        label: 'THE OUTCOME',
        head: 'A suite that catches drift',
        body: 'The regression harness is the part I would defend hardest. Retrieval quality degrades quietly — a chunking change or a new embedding model shifts results without throwing an error — and a fixed set of query/expectation pairs is the only thing that makes that visible before a user finds it.',
        hero: { kind: 'metrics' },
        metrics: [
          { label: 'Regression tests in the suite', value: '63', verified: true },
          { label: 'Questions indexed', value: FILL, verified: false },
          { label: 'Retrieval precision @5', value: FILL, verified: false },
        ],
      },
    ],
  },

  {
    id: 'davina',
    n: '03',
    name: 'Davina Aerospace',
    category: 'PLATFORM / PRODUCT',
    year: '2025',
    accent: '#22d3ee',
    claim: 'Mission data, telemetry and flight context on one surface.',
    role: 'Product design · full-stack',
    stack: ['TypeScript', 'React', 'Node.js'],
    links: {
      live: null,
      repo: 'Davina_AeroSpace',
      caseStudy: null,
      liveNote: null,
    },
    chapters: [
      {
        n: '01',
        label: 'THE PROBLEM',
        head: 'Context split across four tools',
        body: 'Mission data, live telemetry and the flight context that explains both lived in separate places. Reading a single anomaly meant holding three windows and a timestamp in your head, and the reconciliation happened in the operator rather than in the software.',
        hero: { kind: 'dashboard' },
      },
      {
        n: '02',
        label: 'THE CONSTRAINT',
        head: 'Density without noise',
        body: 'Operational interfaces fail in one of two directions: too sparse to be useful, or so dense that the important reading is lost among forty that are not. The whole design problem was deciding what earns permanent screen space and what appears only when it changes.',
        hero: { kind: 'layout' },
      },
      {
        n: '03',
        label: 'THE BUILD',
        head: 'One surface, typed end to end',
        body: 'A TypeScript React front end over a Node service, with the telemetry schema shared between them so a field cannot exist on one side and not the other. Views compose from the same primitives, which is what keeps a dense interface consistent as it grows rather than accumulating one-off panels.',
        hero: { kind: 'architecture' },
      },
      {
        n: '04',
        label: 'THE AI',
        head: 'Deliberately none',
        body: 'There is no model in this product, and that is the honest answer rather than an omission. Everything it does is deterministic, auditable and needs to stay that way — inserting inference into a telemetry readout would add a failure mode without removing any work. Knowing where not to put a model is part of the skill.',
        hero: { kind: 'note' },
        aside: {
          role: 'None. This system is deterministic by design.',
          guardrail: 'Telemetry readouts must be reproducible from the source data alone.',
          notModel: 'Everything. Deliberately.',
        },
      },
      {
        n: '05',
        label: 'THE OUTCOME',
        head: 'One window instead of four',
        body: 'The reconciliation that used to happen in the operator now happens in the schema. What I would change: the first version put too much on screen permanently, and the second pass was mostly deletion — the strongest edits to this interface were all removals.',
        hero: { kind: 'metrics' },
        metrics: [
          { label: 'Surfaces consolidated', value: FILL, verified: false },
          { label: 'Shipped', value: FILL, verified: false },
        ],
      },
    ],
  },
];

/* THE LEDGER — everything else, one line each.

   These were six bespoke 3D worlds. Three of them were marked "do not hold up" in the
   old handoff by the person who built them, and a portfolio is judged on its weakest
   featured item, not its average. Listed honestly with a real link is a stronger
   position than a mediocre showcase. */
export const LEDGER = [
  {
    name: 'Job-Agent',
    category: 'AI AGENT',
    year: '2025',
    line: 'An autonomous loop that searches, filters and applies to roles unattended.',
    stack: ['JavaScript', 'LLM agents'],
    repo: 'Job-Agent',
  },
  {
    name: 'Café POS × n8n',
    category: 'AUTOMATION',
    year: '2024',
    line: 'A point-of-sale wired directly into n8n workflows — orders in one end, automation out the other.',
    stack: ['TypeScript', 'n8n'],
    repo: 'Cafe_pos',
  },
  {
    name: 'Housing Predictor',
    category: 'MACHINE LEARNING',
    year: '2024',
    line: 'Regression models over housing market features, with the feature engineering doing most of the work.',
    stack: ['Python', 'scikit-learn', 'Pandas'],
    repo: 'Housing_Predictor_ML',
  },
  {
    name: 'Buddy App',
    category: 'PRODUCT',
    year: '2024',
    line: 'A companion app built to be opened twice — the second time is the hard part.',
    stack: ['JavaScript'],
    repo: 'Buddy-App',
  },
];

/* What I do — the opening. Three claims, not five acts.

   The previous version gave this five full-screen beats before the reader saw a single
   project. It is context for the work, so it gets the space of context. */
export const THESIS = [
  {
    n: '01',
    head: 'Agents that reach production',
    body: 'Pipelines wired into the systems of record — tickets, repositories, logs. The agent drafts the change; an engineer reviews it and merges it.',
  },
  {
    n: '02',
    head: 'Whole systems, not features',
    body: 'Data model, services, interface and the deploy path, designed together rather than assembled afterwards.',
  },
  {
    n: '03',
    head: 'Models assemble. Engineers decide.',
    body: 'Context is expensive for a human and cheap for a model. Judgement is the reverse. Every pipeline here is drawn on that line.',
  },
];

export const CONTACT = {
  email: 'govada.akash@gmail.com',
  github: 'https://github.com/Atomstars',
};
