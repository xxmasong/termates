import { useCallback, useMemo } from 'react';

import { Modal, TabBar } from '@/components';

import { ACCOUNT_COPY, ACCOUNT_MODAL_WIDTH, ACCOUNT_TABS } from '../constants';
import { useAccountModal } from '../hooks/useAccountModal';
import { useMe } from '../hooks/useMe';
import { usePlanTab } from '../hooks/usePlanTab';
import { useSignOutEverywhere } from '../hooks/useSignOutEverywhere';
import { AccountDetailsTab } from './AccountDetailsTab';
import { AgentDefaultsTab } from './AgentDefaultsTab';
import { PlanTab } from './PlanTab';
import { PreferencesTab } from './PreferencesTab';

interface AccountModalProps {
  onOpenVoiceSettings: () => void;
}

/** Account & settings: plan + usage, preferences, agent defaults, account. */
export const AccountModal: React.FC<AccountModalProps> = ({ onOpenVoiceSettings }) => {
  const modal = useAccountModal();
  const { data: me } = useMe();
  const planTab = usePlanTab(me, modal.isOpen && modal.tab === 'plan');
  const { signOutEverywhere, pending } = useSignOutEverywhere();
  const tabs = useMemo(() => ACCOUNT_TABS.map((tab) => ({ id: tab.id, label: tab.label })), []);
  const { close } = modal;

  const openVoice = useCallback(() => {
    close();
    onOpenVoiceSettings();
  }, [close, onOpenVoiceSettings]);
  const onSignOutEverywhere = useCallback(() => signOutEverywhere(), [signOutEverywhere]);

  return (
    <Modal
      onClose={close}
      open={modal.isOpen && Boolean(me)}
      title={ACCOUNT_COPY.modalTitle}
      width={ACCOUNT_MODAL_WIDTH}
    >
      <div className="account-modal">
        <TabBar
          activeId={modal.tab}
          ariaLabel={ACCOUNT_COPY.modalTitle}
          className="account-modal__tabs"
          items={tabs}
          onChange={modal.setTab}
        />
        {me && modal.tab === 'plan' ? (
          <PlanTab
            confirming={planTab.confirming}
            limits={planTab.limits}
            message={planTab.message}
            onChoose={planTab.choose}
            options={planTab.options}
            pendingPlan={planTab.pendingPlan}
            usage={planTab.usage}
            usageUnavailable={planTab.usageUnavailable}
          />
        ) : null}
        {modal.tab === 'preferences' ? <PreferencesTab onOpenVoiceSettings={openVoice} /> : null}
        {modal.tab === 'agents' ? <AgentDefaultsTab /> : null}
        {me && modal.tab === 'account' ? (
          <AccountDetailsTab
            me={me}
            onSignOutEverywhere={onSignOutEverywhere}
            signingOut={pending}
          />
        ) : null}
      </div>
    </Modal>
  );
};
