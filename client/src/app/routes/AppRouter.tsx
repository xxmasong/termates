import { lazy, Suspense } from 'react';

import { ErrorBoundary, Spinner } from '@/components';
import { isAuthPath, ROUTES } from '@/constants';
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
  return (
    <ErrorBoundary resetKey={pathname}>
      <RouteContent navigate={navigate} pathname={pathname} />
    </ErrorBoundary>
  );
};

interface RouteContentProps {
  pathname: string;
  navigate: (to: string) => void;
}

const RouteContent: React.FC<RouteContentProps> = ({ pathname, navigate }) => {
  if (isAuthPath(pathname)) {
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
