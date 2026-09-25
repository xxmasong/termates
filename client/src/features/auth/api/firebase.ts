import { getApps, initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

import type { FirebaseWebConfig } from '../types';

let cached: Auth | null = null;

/** The app's single Firebase Auth instance, created on first use. */
export const getFirebaseAuth = (config: FirebaseWebConfig): Auth => {
  if (cached) return cached;
  const app =
    getApps()[0] ??
    initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      appId: config.appId,
    });
  cached = getAuth(app);
  return cached;
};
