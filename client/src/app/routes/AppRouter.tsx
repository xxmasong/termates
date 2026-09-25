import { lazy, Suspense } from 'react';

import { Spinner } from '@/components';
import { ROUTES } from '@/constants';
import { LandingPage } from '@/features/landing';
import { usePathname } from '@/lib/hooks';

const WorkspaceRoute = lazy(async () =>
  import('./WorkspaceRoute').then((module) => ({ default: module.WorkspaceRoute })),
);
const AuthRoute = lazy(async () => import('@/features/auth'));

interface AppRouterProps {
  children?: never;
}

export const AppRouter: React.FC<AppRouterProps> = () => {
  const { pathname, navigate } = usePathname();

  if (
    pathname === ROUTES.LOGIN ||
    pathname === ROUTES.SIGNUP ||
    pathname === '/verify-email' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password'
  ) {
    return (
      <Suspense
        fallback={
          <main className="app-route-spinner">
            <Spinner size={24} />
          </main>
        }
      >
        <AuthRoute navigate={navigate} pathname={pathname} />
      </Suspense>
    );
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
