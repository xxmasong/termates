import type { ComparisonRow, FaqEntry, NavLink, SimPane, SimStep } from './types';

export const MOBILE_BREAKPOINT = 760;
export const SCROLL_THRESHOLD = 8;
export const SIM_STEP_MS = 2_000;
export const SIM_HOLD_STEPS = 1;
export const LANDING_TITLE = 'TermHive — your coding agents, working as one team';
export const NAV_LINKS: readonly NavLink[] = [{ label: 'Product', href: '#product' }, { label: 'The Keeper', href: '#keeper' }, { label: 'Compare', href: '#compare' }, { label: 'FAQ', href: '#faq' }];
export const COPY = {
  brand: 'TermHive', signIn: 'Sign in', getStarted: 'Get started', openWorkspace: 'Open workspace →',
  hero: { eyebrow: 'AGENT ORCHESTRATION, VENDOR-NEUTRAL', titleA: 'Your coding agents,', titleB: 'working as one team.', body: 'Run Claude Code, Codex, Gemini and OpenCode side by side in real terminals. They message each other, share a project memory, and take direction from the Keeper — an orchestrator you just talk to.', primary: 'Start your hive', secondary: 'See how it works', micro: 'Uses the subscriptions you already have · Runs in any browser · Keeps working when you close the tab' },
  sim: { title: 'checkout-redesign — 4 agents', live: '● live', toast: '✉ from codex: orders API now returns {total, currency}', keeper: 'All four agents done. PR ready: 3 files, tests green.' },
  works: { label: 'Bring the agents you already use', names: ['Claude Code', 'Codex', 'Gemini CLI', 'OpenCode'] },
  problem: { eyebrow: 'THE PROBLEM', title: 'Four terminals. Four tabs. Zero coordination.', body: 'Every coding agent is brilliant alone and oblivious together. You copy output from one into another, lose track of who\'s doing what, and babysit sessions that die the moment your laptop sleeps.', caption: 'After: one hive.' },
  features: { eyebrow: 'WHAT YOU GET', title: 'A control room, not another chat box.' },
  how: { eyebrow: 'HOW IT WORKS', title: 'From zero to a working hive in three steps.' },
  keeper: { eyebrow: 'MEET THE KEEPER', title: 'One conversation to run them all.', body: 'The Keeper is an orchestrator agent that can see your whole hive. Ask it to spin up a team, check on progress, or get an answer from a specific agent — it does the legwork and reports back.' },
  compare: { eyebrow: 'HOW WE\'RE DIFFERENT', title: 'Built for teams of agents, not a single one.', body: 'Most tools give you one very good agent. TermHive gives you a coordinated team — and lets you keep the agents you already trust.', footnote: 'Categories summarize typical products as of 2026. Individual tools vary and change quickly.' },
  audience: { eyebrow: 'WHO IT\'S FOR', title: 'Made for people who ship.' },
  cta: { title: 'Put your agents to work — together.', body: 'Create your hive in under a minute.', primary: 'Get started free' },
  footer: '© 2026 TermHive. Built for the multi-agent era.',
} as const;
export const SIM_PANES: readonly SimPane[] = [
  { id: 'claude', cli: 'claude', role: 'frontend', status: 'idle', lines: ['$ claude', 'Ready for checkout UI.'] },
  { id: 'codex', cli: 'codex', role: 'backend', status: 'running', lines: ['$ pnpm test api/orders'] },
  { id: 'gemini', cli: 'gemini', role: 'qa', status: 'idle', lines: ['Waiting for build…'] },
  { id: 'opencode', cli: 'opencode', role: 'docs', status: 'idle', lines: ['Reviewing project wiki…'] },
];
export const SIM_STEPS: readonly SimStep[] = [
  { paneId: 'codex', lines: ['✓ 42 passed'] }, { message: true }, { paneId: 'claude', lines: ['Updating CheckoutSummary.tsx…', '+18 −6  CheckoutSummary.tsx'] }, { paneId: 'gemini', lines: ['Running e2e: checkout flow', '✓ 9/9 scenarios'] }, { paneId: 'opencode', lines: ['Writing docs/checkout.md', '✓ wiki updated'] }, { keeper: true }, {},
];
export const FAQ_ENTRIES: readonly FaqEntry[] = [{ question: 'Do I need API keys?', answer: 'No. TermHive runs each vendor\'s own CLI, so you sign in with your existing Claude, ChatGPT or Google account. API keys work too if you prefer them.' }, { question: 'Is my code sent to TermHive?', answer: 'Your agents work inside your own isolated workspace. Code goes only where your chosen CLI sends it — the same as running it on your laptop.' }, { question: 'Which agents are supported?', answer: 'Claude Code, OpenAI Codex, Gemini CLI and OpenCode today. More CLIs are on the way.' }, { question: 'What happens when I close the browser?', answer: 'Nothing stops. Agents run in a background daemon; reopen TermHive on any device and every terminal picks up where it left off.' }, { question: 'Can agents break things?', answer: 'Each agent runs with the permissions you choose. You decide per agent whether it asks before acting or runs autonomously.' }, { question: 'What does it cost?', answer: 'TermHive is free during early access. You only pay your AI vendors, through plans you likely already have.' }];
export const COMPARISON_ROWS: readonly ComparisonRow[] = [{ label: 'Mix agents from different vendors', values: ['yes', 'no', 'partial', 'no', 'partial'] }, { label: 'Agents message each other', values: ['yes', 'no', 'no', 'no', 'no'] }, { label: 'Orchestrator you can talk to', values: ['yes', 'no', 'partial', 'partial', 'no'] }, { label: 'Uses your existing subscriptions', values: ['yes', 'yes', 'partial', 'no', 'yes'] }, { label: 'Full native CLI, not a re-implementation', values: ['yes', 'yes', 'no', 'no', 'yes'] }, { label: 'Shared project memory across agents', values: ['yes', 'partial', 'partial', 'partial', 'no'] }, { label: 'Keeps running with the browser closed', values: ['yes', 'no', 'no', 'yes', 'partial'] }, { label: 'Works from your phone', values: ['yes', 'no', 'no', 'partial', 'no'] }];
