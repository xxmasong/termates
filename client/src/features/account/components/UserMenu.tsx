import { useCallback, useId } from 'react';

import { Badge, Icon } from '@/components';

import { ACCOUNT_COPY } from '../constants';
import { useAccountModal } from '../hooks/useAccountModal';
import { useMe } from '../hooks/useMe';
import { useSignOut } from '../hooks/useSignOut';
import { useUserMenu } from '../hooks/useUserMenu';
import { displayName, initials, planName } from '../utils';

const TOP_PLAN = 'pro-plus';

interface UserMenuProps {
  children?: never;
}

/** Header avatar button with the account's name, plan and Sign out. */
export const UserMenu: React.FC<UserMenuProps> = () => {
  const { data: me } = useMe();
  const { open, toggle, close, rootRef } = useUserMenu();
  const { signOut, pending } = useSignOut();
  const menuId = useId();
  const onSignOut = useCallback(() => signOut(), [signOut]);
  const accountModal = useAccountModal();
  const openPlan = useCallback(() => {
    close();
    accountModal.open('plan');
  }, [accountModal, close]);

  if (!me) return null;
  const name = displayName(me.user);

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={ACCOUNT_COPY.accountMenu}
        className="user-menu__trigger"
        onClick={toggle}
        title={name}
        type="button"
      >
        {me.user.avatarUrl ? (
          <img
            alt=""
            className="user-menu__avatar"
            referrerPolicy="no-referrer"
            src={me.user.avatarUrl}
          />
        ) : (
          <span aria-hidden="true" className="user-menu__avatar user-menu__avatar--initials">
            {initials(me.user)}
          </span>
        )}
      </button>
      {open ? (
        <div className="user-menu__panel" id={menuId} role="menu">
          <div className="user-menu__identity">
            <strong>{name}</strong>
            {me.user.name ? <span>{me.user.email}</span> : null}
            <div className="user-menu__badges">
              <Badge tone="attention">{planName(me.plan.id)}</Badge>
              {me.user.role === 'admin' ? <Badge>{ACCOUNT_COPY.admin}</Badge> : null}
            </div>
          </div>
          {me.plan.id !== TOP_PLAN ? (
            <button
              className="user-menu__item user-menu__item--upgrade"
              onClick={openPlan}
              role="menuitem"
              type="button"
            >
              <Icon name="sparkles" size={13} />
              {ACCOUNT_COPY.upgradeItem}
            </button>
          ) : null}
          <button className="user-menu__item" onClick={openPlan} role="menuitem" type="button">
            <Icon name="settings" size={13} />
            {ACCOUNT_COPY.settingsItem}
          </button>
          <button
            className="user-menu__item"
            disabled={pending}
            onClick={onSignOut}
            role="menuitem"
            type="button"
          >
            <Icon name="logOut" size={13} />
            {ACCOUNT_COPY.signOut}
          </button>
        </div>
      ) : null}
    </div>
  );
};
