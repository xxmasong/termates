import type { Auth } from 'firebase/auth';
import { useEffect, useState } from 'react';

import { getFirebaseAuth } from '../api/firebase';
import { fetchAuthConfig } from '../api/sessionApi';
import type { AuthConfig, AuthConfigStatus, SignupMode } from '../types';

let configRequest: Promise<AuthConfig> | null = null;
const loadConfig = (): Promise<AuthConfig> => (configRequest ??= fetchAuthConfig());

interface AuthConfigState {
  status: AuthConfigStatus;
  auth: Auth | null;
  signupMode: SignupMode;
}

const LOADING: AuthConfigState = { status: 'loading', auth: null, signupMode: 'open' };

/** The Firebase Auth instance for this site, once /auth/config says it exists. */
export const useAuthConfig = (): AuthConfigState => {
  const [state, setState] = useState<AuthConfigState>(LOADING);

  useEffect(() => {
    let active = true;
    void loadConfig().then((config) => {
      if (!active) return;
      setState(
        config.configured
          ? { status: 'ready', auth: getFirebaseAuth(config), signupMode: config.signupMode }
          : { status: 'unconfigured', auth: null, signupMode: config.signupMode },
      );
    });
    return () => {
      active = false;
    };
  }, []);

  return state;
};
