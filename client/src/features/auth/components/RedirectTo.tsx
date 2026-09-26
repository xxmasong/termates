import { useEffect } from 'react';

interface RedirectToProps {
  to: string;
}

/** Client-side redirect that replaces the current history entry. */
export const RedirectTo: React.FC<RedirectToProps> = ({ to }) => {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return null;
};
