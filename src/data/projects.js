/* ==================================================================
   THE WORK
   One entry per project. Each of these gets its own frame — its own
   world, lighting and camera move — not a shared card template.
   `world` is the visual identity Phase 2 builds each frame around.
================================================================== */

export const PROJECTS = [
  {
    id: 'davina',
    name: 'DAVINA AEROSPACE',
    repo: 'Davina_AeroSpace',
    kind: 'Aerospace platform',
    color: 0x6ec8ff,
    desc: 'A TypeScript-built aerospace platform — fitting, for someone named after the sky.',
    tags: ['TypeScript', 'Product', 'Aerospace'],
    world: 'high atmosphere — thin air, hard sunlight, curvature of the earth below',
  },
  {
    id: 'gmat',
    name: 'GMAT VERBAL ENGINE',
    repo: 'gmat-verbal-practice',
    kind: 'EdTech platform',
    color: 0x7ae8ff,
    desc: 'A custom practice platform and parser for GMAT Critical Reasoning and Reading Comprehension — because off-the-shelf was not good enough.',
    tags: ['EdTech', 'Parser', 'Product'],
    world: 'a library of language — text as architecture, arguments as structures',
  },
  {
    id: 'job-agent',
    name: 'JOB-AGENT',
    repo: 'Job-Agent',
    kind: 'Autonomous AI agent',
    color: 0xffb066,
    desc: 'An autonomous AI agent that hunts opportunities while you sleep. AI that works for you — literally.',
    tags: ['AI Agent', 'Automation', 'JavaScript'],
    world: 'a night-side network — signals firing across a dark graph while the world sleeps',
  },
  {
    id: 'cafe-pos',
    name: 'CAFÉ POS × N8N',
    repo: 'Cafe_pos',
    kind: 'Point of sale + automation',
    color: 0xffd9a0,
    desc: 'A point-of-sale system hard-wired into n8n automation flows. Orders in, workflows out.',
    tags: ['TypeScript', 'Automation', 'Systems'],
    world: 'warm interior light — a working machine seen from inside, flows as moving parts',
  },
  {
    id: 'housing',
    name: 'HOUSING PREDICTOR',
    repo: 'Housing_Predictor_ML',
    kind: 'Machine learning',
    color: 0xa0ffc8,
    desc: 'Machine learning that reads the housing market and calls the price before the market does.',
    tags: ['ML', 'Python', 'Data'],
    world: 'a city as data — a terrain of prices rising and falling under a prediction surface',
  },
  {
    id: 'buddy',
    name: 'BUDDY APP',
    repo: 'Buddy-App',
    kind: 'Companion app',
    color: 0xc89aff,
    desc: 'A companion app built to be actually used — clean JavaScript, human-first design.',
    tags: ['JavaScript', 'App', 'Product'],
    world: 'close, soft, human scale — the only warm frame in the film',
  },
];

export const GITHUB = 'https://github.com/Atomstars';
export const EMAIL = 'govada.akash@gmail.com';
export const repoUrl = p => `${GITHUB}/${p.repo}`;
