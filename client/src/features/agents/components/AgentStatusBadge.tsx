import type { AgentStatus } from '@/types';

import { Badge, type BadgeTone } from '@/components';

import { AGENT_STATUS_LABELS } from '../constants';

export interface AgentStatusBadgeProps {
  status: AgentStatus;
}

const STATUS_TONE: Record<AgentStatus, BadgeTone> = {
  awaiting_input: 'attention',
  idle: 'idle',
  running: 'success',
  stopped: 'neutral',
};

export const AgentStatusBadge: React.FC<AgentStatusBadgeProps> = ({ status }) => (
  <Badge tone={STATUS_TONE[status]} withDot>
    {AGENT_STATUS_LABELS[status]}
  </Badge>
);
