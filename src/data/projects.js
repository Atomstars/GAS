/* The work. Each project owns a CATEGORY and a WORLD — see SHOTLIST.md §5.
   `grade` is the per-shot colour grade; it is what makes each project read
   as its own sector rather than a hue swap on a shared object. */

export const PROJECTS = [
  {
    id: 'davina',
    index: 1,
    name: 'DAVINA AEROSPACE',
    category: 'AEROSPACE / PRODUCT',
    repo: 'Davina_AeroSpace',
    blurb: 'An aerospace platform built in TypeScript — mission data, telemetry and flight context in one surface.',
    role: 'Design + Full-stack',
    stack: ['TypeScript', 'React', 'Systems Design'],
    world: 'Orbital vantage at the terminator.',
    accent: 0x8fd4ff,
    grade: {
      lift: [-0.012, -0.006, 0.014],
      gamma: [1.02, 1.0, 0.96],
      gain: [0.96, 1.0, 1.09],
      sat: 0.92,
      contrast: 1.16,
      bloom: 0.85,
    },
  },
  {
    id: 'job-agent',
    index: 2,
    name: 'JOB-AGENT',
    category: 'AI AGENT / AUTONOMY',
    repo: 'Job-Agent',
    blurb: 'An autonomous agent that searches, filters and applies while you sleep. It runs the loop so you do not have to.',
    role: 'Architecture + Agent design',
    stack: ['JavaScript', 'LLM Agents', 'Automation'],
    world: 'A dark graph that thinks.',
    accent: 0xffa943,
    grade: {
      lift: [0.016, 0.004, -0.012],
      gamma: [0.97, 1.0, 1.05],
      gain: [1.1, 1.0, 0.87],
      sat: 1.0,
      contrast: 1.2,
      bloom: 1.0,
    },
  },
  {
    id: 'cafe-pos',
    index: 3,
    name: 'CAFÉ POS × N8N',
    category: 'AUTOMATION / SYSTEMS',
    repo: 'Cafe_pos',
    blurb: 'A point-of-sale wired directly into n8n workflows. Orders go in one end, automation comes out the other.',
    role: 'Full-stack + Integration',
    stack: ['TypeScript', 'n8n', 'Workflow Design'],
    world: 'A working machine, seen side-on.',
    accent: 0xffc98a,
    grade: {
      lift: [0.012, 0.006, -0.006],
      gamma: [0.99, 1.0, 1.03],
      gain: [1.07, 1.0, 0.92],
      sat: 0.96,
      contrast: 1.12,
      bloom: 0.75,
    },
  },
  {
    id: 'housing',
    index: 4,
    name: 'HOUSING PREDICTOR',
    category: 'MACHINE LEARNING / PREDICTION',
    repo: 'Housing_Predictor_ML',
    blurb: 'A model that reads the housing market and calls the price before the market prints it.',
    role: 'ML + Data engineering',
    stack: ['Python', 'scikit-learn', 'Pandas'],
    world: 'A data terrain, flown low.',
    accent: 0x7ff0c0,
    grade: {
      lift: [-0.01, 0.008, 0.0],
      gamma: [1.03, 0.98, 1.01],
      gain: [0.93, 1.06, 0.99],
      sat: 0.95,
      contrast: 1.14,
      bloom: 0.8,
    },
  },
  {
    id: 'buddy',
    index: 5,
    name: 'BUDDY APP',
    category: 'PRODUCT / HUMAN',
    repo: 'Buddy-App',
    blurb: 'A companion app designed to actually get used — clean JavaScript, human-first interaction.',
    role: 'Design + Build',
    stack: ['JavaScript', 'Product Design', 'UX'],
    world: 'Intimate scale. Warm, close, soft.',
    accent: 0xc9a6ff,
    grade: {
      lift: [0.01, -0.002, 0.014],
      gamma: [1.0, 1.01, 0.97],
      gain: [1.03, 0.97, 1.08],
      sat: 1.02,
      contrast: 1.06,
      bloom: 0.7,
    },
  },
  {
    id: 'gmat',
    index: 6,
    name: 'GMAT VERBAL ENGINE',
    category: 'EDTECH / LANGUAGE',
    repo: 'gmat-verbal-practice',
    blurb: 'A practice platform and parser for GMAT critical reasoning and reading comprehension — built because nothing off the shelf was good enough.',
    role: 'Full-stack + Parser',
    stack: ['EdTech', 'Parsing', 'Content Systems'],
    world: 'Text as architecture.',
    accent: 0x7ae8ff,
    grade: {
      lift: [-0.014, 0.0, 0.012],
      gamma: [1.03, 1.0, 0.97],
      gain: [0.94, 1.02, 1.08],
      sat: 0.94,
      contrast: 1.18,
      bloom: 0.9,
    },
  },
];

/* ---------------------------------------------------------------------------
   THE ROOMS.

   The film used to run the six projects as one straight line, which works at six
   and breaks at twenty: the route just gets longer, and a visitor who wants one
   specific kind of work has to fly past everything else to find it.

   So the work is grouped, and the GATE shot before it puts the four rooms on
   screen as destinations. Scrolling on flies the whole route exactly as before;
   choosing a room jumps to it. The default path is unchanged — the gate adds an
   option, it does not impose one.

   `featured` projects keep their own bespoke world. Everything else is listed
   inside its room: title, stack, one line, a link. That split is what makes the
   set scalable — a flagship earns a world, the long tail earns a line, and the
   average quality of the film goes UP as projects are added rather than down.
   --------------------------------------------------------------------------- */

export const CATEGORIES = [
  {
    id: 'ai',
    label: 'AI & AGENTS',
    n: '01',
    line: 'Systems that decide and act on their own.',
    accent: 0xffa943,
  },
  {
    id: 'systems',
    label: 'SYSTEMS & AUTOMATION',
    n: '02',
    line: 'Work that used to be done by hand, wired end to end.',
    accent: 0xffc98a,
  },
  {
    id: 'ml',
    label: 'ML & PREDICTION',
    n: '03',
    line: 'Models that call the number before the market prints it.',
    accent: 0x7ff0c0,
  },
  {
    id: 'product',
    label: 'PRODUCT & INTERFACE',
    n: '04',
    line: 'Things people actually open, and keep opening.',
    accent: 0x8fd4ff,
  },
];

/** Which room each project belongs to. */
export const MEMBERSHIP = {
  'job-agent': 'ai',
  'cafe-pos': 'systems',
  housing: 'ml',
  davina: 'product',
  buddy: 'product',
  gmat: 'product',
};

for (const p of PROJECTS) {
  p.room = MEMBERSHIP[p.id];
  p.featured = true;          // all six currently have a world of their own
}

export const roomOf = (id) => CATEGORIES.find((c) => c.id === id);
export const projectsIn = (roomId) => PROJECTS.filter((p) => p.room === roomId);

export const GITHUB_USER = 'Atomstars';
export const repoUrl = (repo) => `https://github.com/${GITHUB_USER}/${repo}`;
