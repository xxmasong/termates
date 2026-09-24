export type PlanId = 'free' | 'pro' | 'pro-plus';

export interface Plan {
  id: PlanId;
  name: string;
  pitch: string;
  price: string | null;
  priceNote: string;
  maxProjects: number | null;
  maxAgents: number;
  limitsLine: string;
  highlighted: boolean;
}

export const PLANS: readonly Plan[] = [
  {
    id: 'free',
    name: 'Free',
    pitch: 'Try a full hive on one project.',
    price: '$0',
    priceNote: 'forever',
    maxProjects: 1,
    maxAgents: 3,
    limitsLine: '1 project · 3 agents',
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    pitch: 'For builders running several projects at once.',
    price: null,
    priceNote: '',
    maxProjects: 3,
    maxAgents: 10,
    limitsLine: 'Up to 3 projects · up to 10 agents',
    highlighted: true,
  },
  {
    id: 'pro-plus',
    name: 'Pro Plus',
    pitch: 'For teams of agents at full scale.',
    price: null,
    priceNote: '',
    maxProjects: null,
    maxAgents: 30,
    limitsLine: 'Unlimited projects · up to 30 agents',
    highlighted: false,
  },
] as const;
