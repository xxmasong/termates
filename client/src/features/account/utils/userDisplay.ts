import { PLANS } from '@/constants';

import type { Me } from '../types';

const INITIALS_MAX = 2;

export const displayName = (user: Me['user']): string => user.name?.trim() || user.email;

/** "Mia Chen" → "MC", "dev@example.com" → "D". */
export const initials = (user: Me['user']): string => {
  const source = user.name?.trim() || user.email.split('@')[0];
  return source
    .split(/\s+/)
    .slice(0, INITIALS_MAX)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
};

export const planName = (planId: string): string =>
  PLANS.find((plan) => plan.id === planId)?.name ?? planId;
