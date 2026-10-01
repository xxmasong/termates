import type {
  AudienceEntry,
  ComparisonRow,
  FaqEntry,
  FeatureEntry,
  NavLink,
  SimPane,
  SimStep,
  StepEntry,
} from './types';

export const SCROLL_THRESHOLD = 8;
export const SIM_STEP_MS = 2_000;
export const LANDING_TITLE = 'TermHive — your coding agents, working as one team';
/** Control-plane session check; 200 = signed in, 401 = not. */
export const SESSION_ENDPOINT = '/auth/me';

export const NAV_LINKS: readonly NavLink[] = [
  { label: 'Product', href: '#product' },
  { label: 'The Keeper', href: '#keeper' },
  { label: 'Compare', href: '#compare' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];
export const COPY = {
  brand: 'TermHive',
  signIn: 'Sign in',
  getStarted: 'Get started',
  openWorkspace: 'Open workspace →',
  hero: {
    eyebrow: 'AGENT ORCHESTRATION, VENDOR-NEUTRAL',
    titleA: 'Your coding agents,',
    titleB: 'working as one team.',
    body: 'Run Claude Code, Codex, Gemini and OpenCode side by side in real terminals. They message each other, share a project memory, and take direction from the Keeper — an orchestrator you just talk to.',
    primary: 'Start your hive',
    secondary: 'See how it works',
    micro:
      'Uses the subscriptions you already have · Runs in any browser · Keeps working when you close the tab',
  },
  sim: {
    title: 'checkout-redesign — 4 agents',
    live: '● live',
    toast: '✉ from codex: orders API now returns {total, currency}',
    keeper: 'All four agents done. PR ready: 3 files, tests green.',
  },
  works: {
    label: 'Bring the agents you already use',
    names: ['Claude Code', 'Codex', 'Gemini CLI', 'OpenCode'],
  },
  problem: {
    eyebrow: 'THE PROBLEM',
    title: 'Four terminals. Four tabs. Zero coordination.',
    body: "Every coding agent is brilliant alone and oblivious together. You copy output from one into another, lose track of who's doing what, and babysit sessions that die the moment your laptop sleeps.",
    caption: 'After: one hive.',
  },
  features: { eyebrow: 'WHAT YOU GET', title: 'A control room, not another chat box.' },
  how: { eyebrow: 'HOW IT WORKS', title: 'From zero to a working hive in three steps.' },
  keeper: {
    eyebrow: 'MEET THE KEEPER',
    title: 'One conversation to run them all.',
    body: 'The Keeper is an orchestrator agent that can see your whole hive. Ask it to spin up a team, check on progress, or get an answer from a specific agent — it does the legwork and reports back.',
  },
  compare: {
    eyebrow: "HOW WE'RE DIFFERENT",
    title: 'Built for teams of agents, not a single one.',
    body: 'Most tools give you one very good agent. TermHive gives you a coordinated team — and lets you keep the agents you already trust.',
    footnote:
      'Categories summarize typical products as of 2026. Individual tools vary and change quickly.',
  },
  pricing: {
    eyebrow: 'PRICING',
    title: 'Start free. Grow your hive.',
    body: 'Every plan gets every CLI, the Keeper, agent messaging, shared memory and mobile access. Plans differ only in how big your hive can get.',
    includedTitle: 'Everything included',
    earlyAccess: 'Early access',
    noCharge: 'No charge during early access',
    popular: 'Most popular',
    freeCta: 'Start free',
    proCta: 'Choose Pro',
    proPlusCta: 'Choose Pro Plus',
    note: 'Agents count across all projects, running or stopped. AI usage is billed by your own Claude, ChatGPT or Google plan.',
  },
  audience: { eyebrow: "WHO IT'S FOR", title: 'Made for people who ship.' },
  faq: { eyebrow: 'FAQ', title: 'Questions, answered.', hint: 'Swipe to compare →' },
  cta: {
    title: 'Put your agents to work — together.',
    body: 'Create your hive in under a minute.',
    primary: 'Get started free',
  },
  footer: '© 2026 TermHive. Built for the multi-agent era.',
  footerTagline: 'The control room for your coding agents.',
} as const;
export const PRICING_INCLUDED = [
  'Claude Code, Codex, Gemini CLI & OpenCode',
  'The Keeper orchestrator',
  'Agent-to-agent messaging',
  'Shared wiki & files',
  'Works on any device',
] as const;
export const SIM_PANES: readonly SimPane[] = [
  {
    id: 'claude',
    cli: 'claude',
    role: 'frontend',
    status: 'idle',
    lines: ['$ claude', 'Ready for checkout UI.'],
  },
  {
    id: 'codex',
    cli: 'codex',
    role: 'backend',
    status: 'running',
    lines: ['$ pnpm test api/orders'],
  },
  { id: 'gemini', cli: 'gemini', role: 'qa', status: 'idle', lines: ['Waiting for build…'] },
  {
    id: 'opencode',
    cli: 'opencode',
    role: 'docs',
    status: 'idle',
    lines: ['Reviewing project wiki…'],
  },
];
export const PROBLEM_TERMINALS = [
  { cli: 'claude', lines: ['$ claude', '> refactor checkout…'] },
  { cli: 'codex', lines: ['$ codex', '> add orders API…'] },
  { cli: 'gemini', lines: ['$ gemini', '> write e2e tests…'] },
  { cli: 'opencode', lines: ['$ opencode', '> update docs…'] },
] as const;
export const SIM_STEPS: readonly SimStep[] = [
  { paneId: 'codex', lines: ['✓ 42 passed'] },
  { message: true },
  { paneId: 'claude', lines: ['Updating CheckoutSummary.tsx…', '+18 −6  CheckoutSummary.tsx'] },
  { paneId: 'gemini', lines: ['Running e2e: checkout flow', '✓ 9/9 scenarios'] },
  { paneId: 'opencode', lines: ['Writing docs/checkout.md', '✓ wiki updated'] },
  { keeper: true },
  {},
];
export const FAQ_ENTRIES: readonly FaqEntry[] = [
  {
    question: 'Do I need API keys?',
    answer:
      "No. TermHive runs each vendor's own CLI, so you sign in with your existing Claude, ChatGPT or Google account. API keys work too if you prefer them.",
  },
  {
    question: 'Is my code sent to TermHive?',
    answer:
      'Your agents work inside your own isolated workspace. Code goes only where your chosen CLI sends it — the same as running it on your laptop.',
  },
  {
    question: 'Which agents are supported?',
    answer: 'Claude Code, OpenAI Codex, Gemini CLI and OpenCode today. More CLIs are on the way.',
  },
  {
    question: 'What happens when I close the browser?',
    answer:
      'Nothing stops. Agents run in a background daemon; reopen TermHive on any device and every terminal picks up where it left off.',
  },
  {
    question: 'Can agents break things?',
    answer:
      'Each agent runs with the permissions you choose. You decide per agent whether it asks before acting or runs autonomously.',
  },
  {
    question: 'What does it cost?',
    answer:
      'Free covers 1 project and 3 agents. Pro raises that to 3 projects and 10 agents; Pro Plus gives you unlimited projects and 30 agents. Your AI usage stays on your own Claude, ChatGPT or Google plan.',
  },
  {
    question: 'What counts as an agent?',
    answer:
      'Every agent you create, running or stopped, across all your projects. Delete an agent to free its slot.',
  },
];
export const COMPARISON_ROWS: readonly ComparisonRow[] = [
  { label: 'Mix agents from different vendors', values: ['yes', 'no', 'partial', 'no', 'partial'] },
  { label: 'Agents message each other', values: ['yes', 'no', 'no', 'no', 'no'] },
  { label: 'Orchestrator you can talk to', values: ['yes', 'no', 'partial', 'partial', 'no'] },
  { label: 'Uses your existing subscriptions', values: ['yes', 'yes', 'partial', 'no', 'yes'] },
  { label: 'Full native CLI, not a re-implementation', values: ['yes', 'yes', 'no', 'no', 'yes'] },
  {
    label: 'Shared project memory across agents',
    values: ['yes', 'partial', 'partial', 'partial', 'no'],
  },
  { label: 'Keeps running with the browser closed', values: ['yes', 'no', 'no', 'yes', 'partial'] },
  { label: 'Works from your phone', values: ['yes', 'no', 'no', 'partial', 'no'] },
];
export const COMPARISON_HEADERS = [
  { title: 'TermHive', subtitle: '' },
  { title: 'Single-agent CLIs', subtitle: 'Claude Code, Codex CLI…' },
  { title: 'AI IDEs', subtitle: 'Cursor, Windsurf…' },
  { title: 'Cloud agents', subtitle: 'Devin, Copilot agent…' },
  { title: 'Parallel runners', subtitle: 'Conductor, Claude Squad…' },
] as const;
export const FEATURE_ENTRIES: readonly FeatureEntry[] = [
  {
    title: 'Real terminals, not wrappers',
    body: 'Every agent is the actual CLI in a full PTY — slash commands, plans, permissions, all of it. Sessions live in a daemon, so closing the browser never kills a run.',
    lines: ['$ claude', '> /plan', '● session restored · 2,418 lines'],
    wide: true,
  },
  {
    title: 'Agents that talk',
    body: 'Built-in messaging lets Claude ask Codex, Codex brief Gemini, anyone ping the team.',
    lines: ['codex → claude'],
  },
  {
    title: 'Shared memory',
    body: 'A project wiki and shared files every agent reads and writes. Context survives restarts and handoffs.',
    lines: ['wiki/architecture.md', 'wiki/decisions.md', 'shared/api-contract.json'],
  },
  {
    title: 'Any layout, any device',
    body: 'Single, split, grid or a free canvas — drag panes where you want them. Install it on your phone and check on the hive from the train.',
    lines: ['□ □ □ □  ▯'],
    wide: true,
  },
  {
    title: 'Pay nothing extra',
    body: 'TermHive drives your existing Claude, ChatGPT and Google plans through their own CLIs. No per-token markup.',
    lines: ['claude 34%', 'codex 12%', 'gemini 5%'],
  },
  {
    title: 'See every move',
    body: "Structured Codex view, a live activity feed and per-CLI usage meters — know what ran, what changed and what's left.",
    lines: ['● codex ran pnpm test', '● claude edited 2 files', '● gemini → qa passed'],
  },
];
export const HOW_STEPS: readonly StepEntry[] = [
  {
    title: 'Connect your CLIs',
    body: 'Sign in to Claude, Codex, Gemini or OpenCode right in the browser. Your credentials stay in your own workspace.',
  },
  {
    title: 'Assemble a team',
    body: 'Create a project, add agents, give each a role — frontend, backend, QA, docs. Mix vendors freely.',
  },
  {
    title: 'Direct the hive',
    body: 'Type into any terminal, broadcast to all of them, or just tell the Keeper what you want done.',
  },
];
export const KEEPER_BULLETS = [
  'Creates projects and agents on request',
  'Asks any agent a question and waits for the answer',
  'Broadcasts instructions to the whole team',
  'Remembers every conversation',
] as const;
export const CHAT_MESSAGES = [
  { speaker: 'You', type: 'user', text: 'Set up a team to add Stripe checkout to the shop repo.' },
  { type: 'tool', text: '▸ create_project  shop-checkout' },
  { type: 'tool', text: '▸ create_agent  claude · frontend' },
  { type: 'tool', text: '▸ create_agent  codex · backend' },
  {
    speaker: 'Keeper',
    type: 'keeper',
    text: 'Done — two agents are running. Codex is drafting the payments endpoint; Claude will build the form once the contract is in shared files.',
  },
  { speaker: 'You', type: 'user', text: "How's backend doing?" },
  { type: 'tool', text: '▸ ask_agent  codex' },
  {
    speaker: 'Keeper',
    type: 'keeper',
    text: 'Codex says: "Endpoint and webhook handler done, 12 tests passing. Waiting on the Stripe test key."',
  },
] as const;
export const AUDIENCE_ENTRIES: readonly AudienceEntry[] = [
  {
    title: 'Solo builders',
    body: 'Run a whole team by yourself. Let agents parallelize while you review.',
  },
  {
    title: 'Small teams',
    body: 'Give every project its own hive, share the memory, and stop re-explaining context.',
  },
  {
    title: 'Agent tinkerers',
    body: 'Pit Claude against Codex on the same task, or chain them. Every vendor, one screen.',
  },
];
