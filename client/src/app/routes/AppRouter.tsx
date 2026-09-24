import { lazy, Suspense, useEffect } from 'react';

import { Spinner } from '@/components';
import { ROUTES } from '@/constants';
import { LandingPage } from '@/features/landing';
import { usePathname } from '@/lib/hooks';

const WorkspaceRoute = lazy(async () =>
  import('./WorkspaceRoute').then((module) => ({ default: module.WorkspaceRoute })),
);

interface AppRouterProps {
  children?: never;
}

const RedirectToWorkspace: React.FC = () => {
  useEffect(() => {
    window.location.replace(ROUTES.APP);
  }, []);

  return null;
};

export const AppRouter: React.FC<AppRouterProps> = () => {
  const { pathname } = usePathname();

  if (pathname === ROUTES.LOGIN || pathname === ROUTES.SIGNUP) {
    return <RedirectToWorkspace />;
  }

  if (pathname === ROUTES.APP || pathname.startsWith(`${ROUTES.APP}/`)) {
    return (
      <Suspense
        fallback={
          <main className="app-route-spinner">
            <Spinner size={24} />
          </main>
        }
      >
        <WorkspaceRoute />
      </Suspense>
    );
  }

  return <LandingPage />;
};
