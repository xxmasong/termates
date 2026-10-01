import { AgentDefaultsForm } from '@/features/agents';

import { ACCOUNT_COPY } from '../constants';

interface AgentDefaultsTabProps {
  children?: never;
}

export const AgentDefaultsTab: React.FC<AgentDefaultsTabProps> = () => (
  <div className="account-tab">
    <section className="account-section">
      <h3>{ACCOUNT_COPY.agentsTitle}</h3>
      <p className="account-muted">{ACCOUNT_COPY.agentsBody}</p>
      <AgentDefaultsForm />
    </section>
  </div>
);
