import { Icon, Spinner } from '@/components';

import { ACCOUNT_COPY } from '../constants';

interface ProvisioningScreenProps {
  children?: never;
}

export const ProvisioningScreen: React.FC<ProvisioningScreenProps> = () => (
  <main aria-busy="true" className="account-screen">
    <div className="account-screen__mark account-screen__mark--pulse">
      <Icon name="logo" size={28} />
    </div>
    <h1>{ACCOUNT_COPY.preparingTitle}</h1>
    <p>{ACCOUNT_COPY.preparingBody}</p>
    <Spinner size={18} />
  </main>
);
