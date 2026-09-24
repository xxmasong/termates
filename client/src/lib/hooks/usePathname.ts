import { useCallback, useEffect, useState } from 'react';

export const usePathname = () => {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((nextPathname: string) => {
    window.history.pushState(null, '', nextPathname);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  return { pathname, navigate };
};
